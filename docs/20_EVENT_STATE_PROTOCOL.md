# 20. ゲーム状態・コマンド処理・保存プロトコル（v0.5 規範）

このファイルは12、16、07の不足事項を補う。ユースケースは [23](23_QA_RELEASE_CONTRACT.md) を参照。設計値の変更は設定JSONに同期する。

## 1. 画面とゲーム状態
- `TITLE` はメニューUIであり保存する `phase` に含まない。
- 永続 `phase`: MORNING, OPEN, COOK, REACTION, RESULT, UPGRADE。
- `overlay` は null / PAUSE / EVENT。ユーザーのポーズ、モーダル、ブラウザ非表示時はゲームクロック停止。モーダル表示だけで店舗の注文が消えたり再発行されない。
- `phase=COOK` iff `activeOrderId` はcooking注文を指し `cookingSession` は同じIDを持つ。REACTIONはserved注文を `lastServedOrderId` で示し、activeOrderId/cookingSessionはnull。
- 新規ゲームはDay1/MORNING、初期現金30,000、評判30、5種在庫各10、基本たれ1件で開始。デバッグ機能は本番に露出させない。

## 2. コマンドとその正規順序
処理器は単一のシリアルReducer（イベントループ）とする。UIが同時に複数回送信しても状態は一つずつ評価される。コマンドは `commandId`（セッションをまたいでも一意）、`issuedAtTick`、`type`、`payload` を持つ。
1. タイムステップ開始時にoverlay/visibility/phaseを確認する。
2. OPEN/COOKのみ営業時間・queued待ちを1/30秒進め、0以下になったqueuedをID昇順でexpiredにして評判-2を適用。COOK中のactive注文を期限切れにしない。
3. 期限切れ処理の**後に**その秒に到来した候補客を到着順に抽選/発行、満員なら候補を消費して逸失+1。
4. ユーザーコマンドは投入順に検証・適用（同一tickの期限切れと競合なら期限切れ優先）。
5. 最後に自動閉店可否を判定し、1回だけ固定費を記録する。
6. 読み出し用の不変スナップショットをUIへ渡す。画像演出はドメイン状態に一切書き込まない。
- 仕様12にあった「閉店判定→ユーザーコマンド」の順序はこのv0.5で**閉店判定を最後**に統一する。
- 同一commandIdを再送したら応答を再取得できるが**新たな副作用は無い**。`appliedCommandIds`をセーブに保存し、orderId/dayIdに対する遷移も状態で二重チェック。クライアントのdebounceだけでは防止とみなさない。
- 内部時計に過大deltaが来たらタブ休止とし自動PAUSE。見えない時間をまとめて営業に計上しない。速度を増すデバッグ操作は公開版で無効。

## 3. Day1チュートリアル
- 8人の順番は config.day1.orderTypes の通り、各客1注文。先の注文が終端かつ前のREACTIONが消えたら次の1件を生成。
- 初回注文は `SERVE` と `REACTION` をプレイヤーが経験するまで `CANCEL_ORDER` を無効化。最初の客が提供済みかは `tutorialFirstServed` で永続化。
- Day1は営業残秒null、queued忍耐無制限。画面離脱や途中ロードでDay1の客を発行し直さない。
- Day1の`tutorialNextOrderIndex`は0..8、発行直後に+1。8件すべて終端かつ反応表示終了で自動CLOSE_DAY。
- 順序固定の4タイプを各2回登場させる。初日結果の35,640円は「全8件提供・仕入0・設備購入0」の時のみ成立。

## 4. 通常日の到着と閉店
- 候補数 `n=clamp(10+floor(startOfDayReputation/25),10,14)` は開店時に固定する。営業途中の評判変化で当日再計算しない。
- `arrivalSecond[i]=20+floor(i*540/n)`、iは0..n-1。客タイプのPRNGは12に従う。満員候補でも乱数を消費して次のindexへ進む。open中の到着候補を読み飛ばした場合は発生順に処理する。
- queuedは通常最大3、cooking1。OPEN/COOK以外では増えない。openingRemainingSeconds=0で新規到着は止めるが、残りqueuedは受理/退出、cookingは提供/破棄まで処理可能。
- **閉店条件**: 通常日 `openingRemainingSeconds===0 && queuedCount===0 && cookingCount===0 && phase===OPEN && overlay===null`。REACTIONからDISMISSしてOPENへ戻った後に判定する。
- すべての通常日客が来る前に開店終了した場合は未到着候補を残存0とし逸失人数には数えない。
- チュートリアルは全8件終端・REACTION終了後。閉店済み日へのCLOSE_DAYは無変更。
- 忍耐の期限が0以下になったtickではUIの遅延クリックで復活させない。終了日やキャンセル時の原価を二重に計上しない。

## 5. 設備購入日（v0.5修正）
- `UPGRADE`は**営業日dayの閉店後**に表示され、購入した設備は **翌営業日day+1の開店から有効**。
- 設備の `unlockDay` は「最初に効果を使える営業日」。よって購入条件は `phase===UPGRADE && day+1>=unlockDay`。すでに購入済・現金不足なら無効。
- `fryer.unlockDay=2` → Day1の閉店後UPGRADEで購入可、Day2からP3許容幅6秒。 `chairs.unlockDay=3` → Day2閉店後UPGRADEで購入可、Day3からqueued忍耐×1.1。
- 各設備購入は `upgradePurchasesYen` に記録し、`cashYen`を減らす。**設備は資産投資で営業利益からは減算しない**。前倒し購入や同じ設備の二重購入は禁止。
- システムをリロードしても購入済みフラグと翌日効力を維持。DAY1の基準現金例は設備購入前（RESULT時点）の値。

## 6. 仕入と支援（v0.5修正）
- MORNINGのみ食材ごとに1/5/10食分の購入。価格は単価×数量、所持金を負にする購入は不可、在庫99食分上限。
- `BUY_INGREDIENT` はcommandIdで冪等。購入操作は成功後即保存。リロード時に注文を再処理しても現金は二重減額されない。
- **支援条件**: どれか1種類が1食分未満であり、足りない種類を各1食分揃える費用が現在の現金を超える場合にだけ表示。且つ`aidGrantedDay!==day`。
- **支援効果**: 各材料を `max(current,4)` 食分まで補填（99を超えない）。「すでに4以上ある食材をさらに4増やす」ことはない。現金支払0、現物支給で会計原価は受け入れ時には発生せず、**実際に使った皿だけ原価計上**。
- 支援ボタンを同日2回押しても1回目の結果が保存されるだけ。欠品が多くなっても同日に再支援不可。Day1の初期在庫状態では表示なし。
- `MORNING`で支援条件に該当しない在庫不足のときは仕入を案内。開店ボタンは許可し、品切れのまま開店するとqueuedがexpiredになり得ることを明示する。

## 7. 調理・たれ・再試行
- P1〜P6の採点は14に従う。満点以外でも提供可能。P4は技能採点をしない（固定20点）。
- 基本たれ `basic`は削除/編集不可。追加2枠をMORNINGで編集・保存可。COOKでは保存済みの最大3件から選択するのみ。
- COOK開始時はbasicを選択状態に初期化。P4で別プリセットを選ぶとその時点の味3軸をSessionにコピー。提供時の味適合は保存済みスナップショットで計算、後日編集の影響なし。
- P3/P5のタイマーは「開始」後にのみ進む。PAUSE/フォーカス喪失/REACTIONでは停止。途中で保存したら `timerStarted` と経過秒を保存、復元時はPAUSE表示からユーザーが再開したときだけ計測再開。
- ドラッグ中に画面外へ出た場合は未確定ストロークを破棄、最後の確定セルのみ残す。pointercancelでは採点しない。P1の押下入力とP6のスロット配置はpointerup確定。
- やり直しは1皿で合計1回（初日は無制限）、現在工程の結果のみ破棄。すでに確定した過去工程点数を消さない。リトライは材料を追加で消費しない。
- すべてのscoreは `score=clamp(Math.round(q+15-0.3*d),0,100)`。表示側で再計算せずREACTIONでは保存済みscore/rankを用いる。

## 8. Save / Quitのコミット
- 永続化はIndexedDB内のmain/backupで**一つのreadwrite transaction**: 直前mainの検証済みスナップショットをbackupへ、mainへ revision+1 の新スナップショットを同時書込。transaction completeの後だけ成功通知。abort時は両キーを変更しない。
- IndexedDBのブラウザ環境による永続保証は絶対ではない。Storage quota/プライベートブラウザ/ブラウザ消去時の喪失可能性をUIで明示し、未保存終了時は警告。継続不能なら旧セーブを自動破壊せずバックアップ復元を提示。
- `SAVE_QUIT`: valid snapshot→persist成功→TITLE。保存失敗時は同じ画面を維持し、再試行可能。Titleの「はじめから」は既存データの上書き確認。
- セーブ時点のactive COOKは最終確定ストローク・経過秒までを保存。ドメインtick中に二重保存せずシリアル処理。
- `REACTION`復元時はrank/会計済み注文IDから表示を復元し、音・演出だけ再開。SERVEを再呼びしない。
- `UPGRADE`からの `NEXT_DAY` はdayを+1し、日次Ledger・arrival予定・閉店フラグを初期化し、現金/在庫/評判/設備/ストーリー既読は引き継ぐ。

## 9. 不変条件
- すべてのコマンドは事前条件が満たされない場合 `{ok:false,reason}` を返し、状態は**完全に同一**のままとする。
- 1注文は queued→(expired または cooking→served/cancelled) 以外に遷移しない。調理は最大1、queued最大3。
- SERVEは同一注文につき1回、材料消費はACCEPT_ORDERにつき1回、CLOSE_DAYはdayにつき1回、設備はIDにつき1回。
- 評判は0〜100。現金は負値を許容する（固定費による負値等）が購入で負値にすることを許可しない。
- `ingredientConsumedYen`は廃棄原価を含む。 `wasteYen` を営業利益から重複控除しない。
- `Day1`では8件の順序、最初の提供/評価、全部終端したときの結果表示が成立する。
- 同じseed/入力コマンド列なら同じ抽選・点数・会計。ロード・描画負荷・タブ非表示に依存しない。
