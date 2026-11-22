# UIモックアップ v0.3 — 銀髪キャラクター統一版

作成日: 2026-11-22 / 状態: **コンセプト検証用・未承認**

## 方針
- ユーザーから指定された銀〜薄紫色の短めの髪、左右のお団子、ピンク色の瞳と丸いピンクのヘアピンをキャラクターの同一性として統一する。
- **元画像のデニムオーバーオールなどの服装は踏襲しない**。店舗用には白/クリーム色のブラウス＋ワインレッド系のエプロン/リボンを基準衣装案とする。タイトル画面の私服は演出用に分離。
- 既存の茶髪の店員キャラクターを主要UIから置き換える。
- UIのパネルは温かい木目、クリーム色、深い赤、ゴールドのポイント。料理が主役になる。
- 本画像は機能検証前のイメージ。操作部品はゲーム本体では画像として一体化せず、React/PixiJSなどで再実装する。

## 作成した画面
| ID | 画面 | ファイル名 | 確認する項目 |
| --- | --- | --- | --- |
| 00 | タイトル | 00_title.png | 主要キャラクター、料理、タイトル、メニューの配置 |
| 01 | 朝の準備 | 01_morning_prep.png | 在庫リスト、たれ配合、来客予想、開店 |
| 02 | 店舗営業 | 02_shop_open.png | 3件までの注文と待機列、店舗背景、顧客 |
| 03 | 調理・揚げ工程 | 03_cooking_frying.png | P3進行、揚げタイミング、注文情報 |
| 04 | 試食評価SSS | 04_tasting_sss.png | 大きな反応と大きな料理、報酬演出 |
| 05 | 営業結果 | 05_day_result.png | 売上/原価/固定費/利益、次日導線 |
| 06 | 画面一覧 | 06_ui_overview.png | 5画面のデザイン統一 |
| 07 | 拡張構想 | 07_ui_extended_concepts.png | 今後の画面案。MVPに含まないものもあり |

## 画像管理と登録状況
- 2026-11-22、高解像度PNG 8枚（00〜07）を `public/assets/mockups/v03/` に追加。ZIP内manifestのSHA-256・寸法・容量と照合済み。
- 軽量WebPプレビュー6ファイルは `public/assets/mockups/v03/previews/` に登録済み（160×90px）。
- 画面ごとの高解像度レビュー用画像は、5画面の生成コンセプトを切り出して16:9キャンバスに配置したもの。**元のパネル分割画像のため、個別画面を独立生成したものではない**。
- 参照用の `character_reference_user.png` は公開対象から除外。登録manifestも公開画像8枚だけを記録。
- ZIPから再取り込みする場合は `scripts/import_mockups.ps1` を使用。

## GitHubプレビュー（軽量版）

| 画面 | 軽量プレビュー |
| --- | --- |
| タイトル | ![タイトル](../public/assets/mockups/v03/previews/00_title.webp) |
| 朝の準備 | ![朝の準備](../public/assets/mockups/v03/previews/01_morning_prep.webp) |
| 店舗営業 | ![店舗営業](../public/assets/mockups/v03/previews/02_shop_open.webp) |
| 調理・揚げ | ![揚げ工程](../public/assets/mockups/v03/previews/03_cooking_frying.webp) |
| SSS試食 | ![試食評価](../public/assets/mockups/v03/previews/04_tasting_sss.webp) |
| 営業結果 | ![営業結果](../public/assets/mockups/v03/previews/05_day_result.webp) |

プレビューはファイルの実在確認と一覧表示を目的とした160×90px版。ゲームのUI実装やアセット品質判定には高解像度版を使用すること。

## 高解像度レビュー画像

| 画面 | PNG |
| --- | --- |
| タイトル | [00_title.png](../public/assets/mockups/v03/00_title.png) |
| 朝の準備 | [01_morning_prep.png](../public/assets/mockups/v03/01_morning_prep.png) |
| 店舗営業 | [02_shop_open.png](../public/assets/mockups/v03/02_shop_open.png) |
| 調理・揚げ | [03_cooking_frying.png](../public/assets/mockups/v03/03_cooking_frying.png) |
| SSS試食 | [04_tasting_sss.png](../public/assets/mockups/v03/04_tasting_sss.png) |
| 営業結果 | [05_day_result.png](../public/assets/mockups/v03/05_day_result.png) |
| 画面一覧 | [06_ui_overview.png](../public/assets/mockups/v03/06_ui_overview.png) |
| 拡張構想 | [07_ui_extended_concepts.png](../public/assets/mockups/v03/07_ui_extended_concepts.png) |

## 仕様書との差異：実装では必ず修正
1. 自動生成画像内の売上・来客数・残り時間・価格等は**演出用の数値で、ゲーム仕様ではない**。ゲームロジックは02/03/05/07のv0.2を参照。
2. 正式仕様は初日8注文、通常日のqueued最大3、cooking最大1。画面上の列や数値が異なる場合は仕様に合わせる。
3. SSS試食画面では誰が料理を作り、誰が食べたかが曖昧。**店主・顧客は別役割**とし、正式採用時に顧客の立ち絵・リアクションを設定する。
4. たれのUIは甘さ/コク/酸味の10刻み、P4でプリセット選択。画像の細かな設定項目を無断追加しない。
5. 試食演出中はゲーム内時計停止、売上・評判はSERVEで一度だけ確定する。
6. タイトル衣装と店員衣装は異なる場合がある。正式キャラ設定シートで衣装・髪の同一性を定義する。
7. ロゴ・料理・背景・人物を分離して実装可能なアセットとして作成し、テキストをラスタ画像に直書きしない。
8. かつめしの基本はご飯＋薄いカツ＋デミグラス系のたれ＋茹でキャベツ。生成画像の盛付けを最終正解と扱わない。

## 次の制作タスク
- 01〜05を一つずつ単独の16:9完成モックとして再制作（現状はコラージュ切り出し）。
- 新キャラの正式デザインシート（表情6ランク、店内服、私服、顔パーツ位置基準）作成。
- 料理のcanonical完成皿、たれ差分、キャラ差分の透明PNGを別管理。
- 画面をWebモックへ分解し、ボタン/注文キュー/経営数値を実際に操作できる状態にする。

## 参考資料
- [アセット仕様](06_ART_ASSETS.md)
- [画面仕様](04_UI_UX.md)
- [仕様レビュー](10_SPEC_REVIEW.md)
