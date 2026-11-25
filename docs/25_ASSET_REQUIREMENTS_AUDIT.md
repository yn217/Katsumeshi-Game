# アセット仕様との照合（2026-11-23）

## 結論

仕様書を根拠に制作対象を選んだ素材はありますが、「仕様から必要な完成アセットが一式できた」とは言えません。カテゴリ対応と画面への仮接続までは進んでいます。絵柄・同一性・表示サイズ・画面合成・音の確認は残っており、生成したものは採用済みではなく候補です。

また、作成済み素材のすべてが仕様に直接指定されたものではありません。肉たたき・パン粉トレイなどの道具アイコンやDay7夕景などは補助/追加案です。必須素材と分けて扱います。

## 仕様との対応

| 仕様項目 | 仕様根拠 | 実際にあるもの | 判定 |
| --- | --- | --- | --- |
| 店主と客4人 | `docs/06` 必須キャラ、`docs/17` §3 | ComfyUI＋LoRAで店主の表情6種・店舗服/私服の全身2枚と顧客4タイプ×6ランク24枚を作成。PNG原本とマスクをComfyUI outputに保持し、透過WebPを `public/assets/game/characters/**/v05/` へ書き出した。顧客一覧プレビューは `artifacts/comfy_characters_contact.png`。目視では常連客C/Fが満足げに見え、ランク差が弱い。比較用にC/F控えめ表情の別候補2点をComfyUI＋LoRAで作成し、`artifacts/regular_low_rank_review_v103.jpg` で比較し、候補を試作画面のregular C/Fへ接続。現行v05原本は保持し、候補は `concept_review` として別版管理。追加で店主の顔・髪・店舗服正面/背面/私服のリファレンス画像と色メモ付きボードをComfyUI＋LoRAで制作し `assets/source/comfyui/references/` に保存 | 2026-11-23再検証: 32/32のWebPがmanifest寸法と一致し、すべてalphaとLoRA記録を持つ。ただし現行店主の店舗服/私服全身素材は832×1216で、docs/17 §5の1536×2048を満たさず、alpha bboxが下端に接して透明な下余白もない。v04のChatGPT製全身候補も887×1774で基準未達かつComfyUI＋LoRA制作条件を満たさず、私服v01は不採用記録があるため代替に使わない。既存素材を元にComfyUI＋Koharu/anima-style LoRAの1536×2048 img2img候補2件を生成済み。比較シート `artifacts/owner_fullbody_hr_review_v002.jpg` と靴の拡大確認 `artifacts/owner_hr_feet_margin_check.png` で比較。店舗服・私服の両候補とも靴が画像下端で切れ、alpha bboxも下端に接していることを確認したため `rejected` としてランタイムへ接続しない。仕様17 §5の1536×2048寸法には合うが、§7の足切れなし/透明余白要件を満たさない。生成条件と判定は `assets/source/comfyui/candidates/owner_fullbody_hr_v002/manifest.json` に記録。ユーザー指示により代替ジョブは投入しない。ユーザー指示により以後ComfyUIへのジョブ投入は停止。Animaの公式モデルカードは重み/派生重みを非商用に限定する一方、生成画像は有料ゲーム素材にも商用利用可と記載。ゲームへモデル重みは含めない。ローカルLoRAの学習画像権利は未確認のため全画像は候補状態。リファレンスボードと背面図はランタイム未投入。キャラ同一性と実画面配置も最終レビュー待ち |
| SSS試食の店主＋評価客 | `docs/11` 差異3、`docs/17` §6 手順4 | REACTIONの評価段階で、評価客を `taster`、店主を `tasting-owner` として別レイヤー表示。ランク、料理、客の台詞、得点を重ねる | SSS状態の1280×720/1920×1080キャプチャで客の評価表情・料理・ランク表示と店主レイヤーを確認。1280×720では表示欠けなし。全ランク/全客種の比較、料理画像利用条件、最終素材承認は未完 |
| キャラの再現情報 | `docs/06` ComfyUI制作、`docs/17` §6 | `assets/source/comfyui/jobs.json` と `presets.json` に生成条件を保存し、PNGのComfyUIワークフロー記録からモデル・LoRA・seedを `public/assets/game/characters/v05/manifest.json` に転記。店主は Koharu LoRA 0.8＋anima-style LoRA 0.8、客は anima-style LoRA 0.8。元画像の白シャツ＋デニムは負例指定し、別の服装で生成 | 32枚すべて原本・マスクと照合でき、透過WebP化を確認。レビュー状態は `concept_review` |
| 食材アイコン5種・工程中間絵 | `docs/17` §3、寸法は§5 | ChatGPT画像生成v06で生肉、衣付き肉、パン粉、揚げカツ、たれ、茹でキャベツ、ご飯の7点を制作。透過確認後に個別切り出しし、在庫5種とP1/P2/P4/P5/P6・揚げ色見本へ参照接続。個別PNG原本は約443px、実行WebPは256×256pxで保存 | ChatGPT生成イラスト候補をプレビュー接続。完成皿は含まない。256px透過ファイルとプレビュー同梱を確認。実画面での強弱・配置・権利確認は未完 |
| 調理6工程の中間絵 | `docs/14` P1〜P6、`docs/17` §3 | P1生肉、P2衣付きカツ、P3揚げカツ、P4たれ、P5茹でキャベツ、P6ご飯の6素材を各工程見本に接続。工程道具はChatGPT画像生成v07の統一2D透明アイコン（肉たたき/パン粉トレイ/ソースレードル/キャベツ鍋/しゃもじ）へ切替。ComfyUI製v04道具は不採用・未使用。比較シート `artifacts/tools_equipment_chatgpt_v07.png`。一覧は `assets/source/imagegen/v03/review/cooking_steps_contact_v01.jpg` | 5工程道具/2設備アイコンはプレビュー接続済みでconcept_review。P3旧v07/v08候補は油面との融合で形が読めず却下。v09候補では油から持ち上げて厚い側面と全周シルエットを見せる構図へ変更し、`public/assets/game/cooking/v08/fry_stage_lifted_cutlet_chatgpt_v01.png` を初期候補として接続。後続のv13平塗り候補を `public/assets/game/cooking/v09/fry_stage_cutlet_anime_chatgpt_v01.png` へ登録し、P3プレビュー参照を更新。単体で形と線は確認できるが、実画面サイズと合成は未確認で、承認済み素材ではない。P1/P2の工程素材/道具を作業カード右上の参照カードへ接続。P3〜P6は専用シーン/操作部品で表示し、参照カードを重ねない。パン粉トレイを含む参照カードの実画面縮小表示/画面構成は未確認。新v06揚げ色比較カードはcontain表示。調理中素材は完成皿ではない |
| 完成料理canonical 1枚 | `docs/06` 料理制約、`docs/17` §3 | ユーザー提供の実物写真切り抜き `food/beef_katsumeshi/whole.webp` を全画面共通で使用。ランク別AI生成完成皿は形状が実物と異なるため参照・配布対象から除外。ランク差はバッジ、反応、得点で表現 | 表示差し替え済み。素材利用権と仕様の盛り付け詳細は未確認。新規完成料理画像の制作は保留 |
| たれ外観3差分 | `docs/17` §3 | 未制作 | 未完。canonical確定後 |
| フライヤー・椅子 | `docs/17` §2 | ChatGPT画像生成v07の2D透明アイコンを設備カードへ接続。比較シート `artifacts/tools_equipment_chatgpt_v07.png` | 2026-11-23比較シートを目視し、フライヤー/籠と椅子の形は一覧サイズで判別可能と記録。ゲーム内の実表示サイズ・画面合成・権利確認は未完、concept_review |
| 湯気・揚げ演出・粒子 | `docs/06` 画像規格、`docs/17` §2 | 旧v03をChatGPT画像生成の手描き2D効果v04（蒸気/油はね/金色のきらめき）へ差替え。512×512透過WebPを調理/試食に接続し、比較 `artifacts/effects_v08_review.png`、原本/プロンプト `assets/source/imagegen/chatgpt/v08/effects/`、実行manifest `public/assets/game/effects/v04/manifest.json` | 比較シートで蒸気の筋、控えめな油泡/飛沫、中央を空けた金色の光点を目視。全3点512×512 RGBAで透明余白が各辺48px以上あることを確認。画面上の大きさ/重なり/動きは未確認、concept_review |
| UI操作アイコン | `docs/06` §画像の共通規格（SVGまたはPNG RGBA、256×256基準） | `src/icons.mjs` の24×24 viewBoxインラインSVGセットでメニュー/HUD/操作/評価のピクトグラムを描画し、絵文字・ⓘ/▶/☰/↻等の記号フォント依存を避ける。食材・盛付けにも同モジュールのSVGを使う箇所がある | SVG形式要件に合致し、表示サイズに依存しない。全画面の意味・画風・縮小可読性レビューは未完。ラスター画像を重複生成していない |
| 背景7用途 | `docs/17` §3 | 朝準備/P3厨房/試食/結果はChatGPT生成v07の手描き2D背景を元にしたv08 2560×1440実行WebPへ参照切替。SHOPは左の店主領域・中央の注文UI用床・右の客席を明確に分けたChatGPT生成v11へプレビュー参照を切替。原本/条件 `assets/source/imagegen/chatgpt/v11/backgrounds/`、実行WebP/manifest `public/assets/game/backgrounds/v11/`。既存v10は履歴として保持し、preview buildから除外。背景原本は1672×941から2560×1440へ拡大しており、原寸ディテールは増えていない。タイトル背景は川沿い店舗・左側の川/橋・ロゴ/メニュー用余白を持つv08候補。Day7夕景も同店舗/川/橋のv08候補へ統一。比較シート `artifacts/backgrounds_chatgpt_review_v07.jpg`、`artifacts/backgrounds_v08_contact_sheet.jpg`、`artifacts/day7_bg_v03_v08_review.png` | v11 SHOP背景単体では店主用の暗い左領域、中央の低密度床、奥のカウンター、右端の客席を確認。既存の店主立ち絵とUIを重ねた実画面合成、原寸品質、採用確認は未完。全背景はconcept_review |
| UI枠・ボタン状態・ランク表示 | `docs/17` §3 | `docs/06` UIデザイントークン（赤/金/クリーム/文字/状態色、UI/見出し書体）を `src/styles.css :root` へ集約。9-slice SVG枠、CSSのボタン5状態、文字をHTMLで重ねるランクバッジ6種 | TITLE/MORNING/SHOP/COOK/REACTION/RESULT/UPGRADEの7画面を1280×720/1920×1080で取得。document/viewport寸法一致、画像読込失敗0、JSページエラー0。REACTION/UPGRADEの1280×720は目視で主要要素の欠けなし。証跡は `artifacts/screenshots/*_staged.png`。バッジ6種にランク文字を重ねた比較 `artifacts/rank_badges_runtime_review_v01.png` を確認し、文字が中央余白に収まり、SSS/S金・A/B青銀・C/F灰色の分類が枠の意匠でも区別できることを確認。実画面サイズでの全ランク表示、1600×900/1366×768と縦長、CSS hover/focus等の実操作レビューは未完 |
| 音楽・効果音 | `docs/15` §7、`docs/17` §3 | 合成BGM4曲・SE11種をWAV生成し、再生処理へ接続。全素材が同じピークへ正規化されて設計上の音量差が失われていたため、SE別ピーク目標（ランクSSS→Fで段階減衰、error/fryを控えめ）を設定して再出力 | 44.1kHz stereo PCM16、ループ端・ピーク/RMSを数値確認。聴感レビューと実機ミックス承認は未完 |

- 2026-11-23追加: UIの既存色を変えずに意味別CSSトークン（ブランド赤/金/クリーム、本文/補助文字、成功/危険、focus-visible）を定義し、UI書体/見出し書体を `src/styles.css :root` に集約。1920×1080用 `src/stage.css` の重複font tokenを除去し、共通定義を参照するよう統一。定義表と9-slice/ボタン状態の値は `docs/06`「UIデザイントークン」に記録。画面ごとのコントラスト・可読性の採用レビューは未完。

## 「適当に作っていないか」への監査結果

- 仕様にある主要カテゴリと必要数（客4人×6評価、BGM4曲、SE約11種など）は制作範囲の根拠にしています。
- ただし、生成プロンプトは仕様書の記述をビジュアル化するための解釈を含みます。仕様書が色・形を決めていない小物や演出は独自案であり、必須要件ではありません。
- 画像を生成して画面に仮接続した事実は、仕様適合や品質承認を意味しません。
- 先行版では顧客24枠をChatGPT画像生成へ置換して比較し、worker/touristのSがSSSに近かった候補を控えめな表情へ差し替えました。その後、ランタイム参照をComfyUI v05へ移し、4タイプ×6ランクを1024×1024で揃えました。常連客C/FはComfyUI＋LoRAで作ったv05画像を参照したComfyUI img2img v103候補をC/Fの該当2枠に接続済みです。ChatGPT v04画像は比較用に残しています。人物属性の細部は仮案で、承認と画面合成確認は未完了です。
- 背景候補を画風・画面用途・全画面充填で比較。旧版ではComfyUI＋anima-style LoRA背景を以前試したが、ユーザー指示により現在は非キャラクターComfyUI素材を使用せず、ChatGPT生成背景へ参照を戻した。タイトル/結果はChatGPT画像生成のv06候補を採用候補として追加。旧タイトル/結果候補は夜景化・暖簾記号・白い端・白帯が出たため不採用。試食・設備の背景は店舗背景を共用。Day7夕景は別候補。新規ComfyUI素材のライセンス・画面合成・最終採用は未承認。
- 2026-11-23画面合成確認: `artifacts/screenshots/title_1280x720_staged.png` では見出しが固定230pxでロゴ領域からはみ出し、店主の顔と背景を隠していたため、`src/stage.css` で段階表示の見出しサイズをviewport幅に追従させた。再撮影・最終採用レビューは未完了。
- すべての採用前候補はレビュー待ちです。仕様の受け入れ項目（同一性、透明余白、1920×1080/1280×720合成、ランクの強弱、ライセンス等）は未完です。
- 2026-11-23追加確認: v03食材/工程のcontact sheetは半写実的なCG寄りで、ComfyUI背景・キャラの2Dアニメ調と画風差がある。画風統一のためComfyUI＋anima-style LoRAで食材/中間工程12候補を生成・目視。丸ごとキャベツ化、縦向きカツ、米の低コントラスト等を確認し、全候補を不採用またはconcept_reviewにして既存ランタイムへは接続していない。
- 2026-11-23顧客表情確認: 旧 `artifacts/comfy_characters_contact.png` は顧客4タイプ×6ランクのv101一覧だが、現在のランタイムでは常連客C/Fだけv103へ切替済みのため、現行参照と2枠が異なる。常連客C/Fの差分比較 `artifacts/regular_low_rank_review_v103.jpg` では低評価表情が現行v05より明確。今回、現行の参照ロジックから24枚を集める `scripts/build_customer_review_sheet.mjs` と一覧 `artifacts/characters_current_runtime_review.html` を作成し、regular C/Fにv103を使うことを含め全パスの存在を確認。画面上での6ランク連続性・画風・同一性の目視判定および採用承認は保留。
- 2026-11-23一次所見: 旧v101一覧のうちv103へ置換された常連客C/F以外の22枚と、v103比較画像を確認。SSS/Sは4タイプとも大きな喜びが読み取りやすい。学生・会社員・観光客はA/B/Cの差が相対的に小さい候補がある。高解像度のworker B/F、tourist B/F、student S/Fを追加確認し、Bは穏やかな笑顔、Fは下向き眉と口角下がりで低評価が読み取れた。常連客C/Fのv103は穏やかな低評価として改善。表情差だけを強く出す再生成は、ユーザーのComfyUI投入停止指示により行わない。全24枚の高解像度個別比較、同一性/画風の採否、ライセンス承認は未完。
- 2026-11-23追加: `scripts/build_customer_runtime_contact_sheet.py` でランタイムmanifestの参照ロジックに合わせた縮小コンタクトシート `artifacts/characters_current_runtime_review_v02.png` を作成し、全24枚のHTML一覧も再生成。現行のregular C/F v103と残りのv101/v05参照を混同しない一覧で比較。縮小時はstudent C/F・tourist C/Fの差が小さく、worker CがBより笑顔に見えるためランク順の表情強度に弱点が残る。SSS/Sは明瞭、regular C/F v103とworker Fは低評価として読み取れる。人物同一性は概ね維持されるが採用承認はしない。該当24件のcurrent-runtime所見とレビュー日を各character manifestへ記録。ユーザー指示に従い追加のComfyUI生成は行わない。
- 2026-11-23追加: ChatGPT画像生成で7種の食材/工程用アイコンシートを作り、手描きセル塗りへ修正。透明背景、7セルの内容と空セルを確認して `assets/source/imagegen/chatgpt/v06/food/` へ原本・個別PNG、`public/assets/game/food/v06/` へWebPとmanifestを保存。完成皿ではない。既存v03食材とP1/P2/P4/P5/P6・P3揚げ色見本の参照をv06へ切替。全体採用ではなくconcept_review。
- 2026-11-23追加: P3揚げ工程の旧画像が写実CG調で、2D手描き調の新背景/道具と不一致だったため、ChatGPT画像生成で揚げ鍋と衣付きカツの専用シーンを制作。旧画像はレイアウト参考、新v07厨房背景は画風参考に限定し、`public/assets/game/cooking/v07/fry_stage_anime_chatgpt_v02.png` を調理画面へ接続。表示比率を新画像の16:9へ合わせ、原本/プロンプト/manifestを記録。P3候補はconcept_review。揚げ工程のUI合成と縮小可読性は未確認。
- 2026-11-23追加: P3現行候補を目視し、カツがフライヤー内で大きな衣の板のように見え、輪郭と厚みが弱いと判定。ChatGPT画像生成で正方形のv08再試作を作ったが同じ問題が残ったため却下し、`assets/source/imagegen/chatgpt/v08/cooking/fry_stage_candidate_rejected_v03.png` とmanifestに判定理由を記録。既存P3画像は置換せず、v08もランタイム未接続。P3は引き続き未承認。
- 2026-11-23追加: ChatGPT製の調理道具5種/設備2種の比較シート `artifacts/tools_equipment_chatgpt_v07.png` を目視。肉たたき、パン粉トレイ、レードル、鍋、しゃもじ、フライヤー、椅子の図柄は一覧表示サイズで判別できた。レビュー日と判別所見を各manifestへ記録した。実ゲームUIでの縮小表示・配置・透明縁・権利/配布承認は未確認のため、状態はconcept_reviewを維持。
- 2026-11-23追加: 同7点の実行WebPを個別にメタデータ確認。全点1024×1024 RGBAでmanifest寸法と一致し、alpha範囲は0〜255、可視部分からキャンバス端まで各辺最低52pxの透明余白を確保。生成原本の寸法は1536×1024（6点）と1312×1199（椅子）で、実行版はサムネイル縮小後に透明1024角へ中央配置。実測したsourceWidth/sourceHeight/transparentMarginPxをmanifestと再生成スクリプトへ反映。縮小UIでの判別性と画面合成は引き続き未確認。
- 2026-11-23追加: ChatGPT効果3素材の比較シート `artifacts/effects_v08_review.png` を目視し、湯気の筋、控えめな油泡/飛沫、中央を空けた金色の光点が用途どおりに見えることを確認。実行WebPは全点512×512 RGBA、alpha範囲0〜255、四辺の透明余白は48px以上。所見/余白値を `public/assets/game/effects/v04/manifest.json` と正規化スクリプトへ記録。実画面でのサイズ、重なり、アニメーション、採用/権利承認は未完。
- 2026-11-23追加: 音源はgeneratorの一律peak正規化が設計ミックスを壊す点を修正。BGMは0.88 peak、SEは役割別0.26〜0.72 peakに設定しWAV原本/ランタイムとmanifestを再生成。peak/RMSを数値確認し、聴感レビューまでは未承認。
- 2026-11-23 権利出所確認: [Anima公式モデルカード](https://huggingface.co/circlestone-labs/Anima)はモデル/派生重みを非商用に限定する一方、生成出力は商用可能（有料ゲーム素材を含む）と記載。ゲームへ重みは配布しない。出力の承認は別であり、Koharu/style LoRAの学習データ権利は未確認。ローカルstyle dataset manifestの212画像は手動権利レビュー必要と記録され、Koharu準備データにはライセンス/出所情報が見当たらない。[OpenAI Terms of Use](https://openai.com/policies/terms-of-use/)は出力をユーザーが所有するとするが、適用法の範囲であり、入力権利と出力の適切性確認は利用者責任。ChatGPT生成画像も自動的な権利保証とは扱わない。
- 工程道具のComfyUI製v04候補はプレビュー参照を解除。P2パン粉トレイはChatGPT画像生成候補へ切替。プレビュービルドは各manifestの生成元を読み、ComfyUI製の非キャラクター画像をパスやフォルダ名に依存せず除外する。2026-11-23のビルドでは旧背景・道具候補14点を除外し、キャラクター候補を保持することを確認。過去はキャラクター以外を拒否する生成制限を設けたが、現在はユーザー指示によりキャラクターを含む全ジョブの投入を停止し、`scripts/comfy_generate.py` は実行を拒否する。

## 作成状況とリリース状態

- 既存キャラクター候補はComfyUI＋LoRA生成のv05を使用します。ユーザー指示によりComfyUIへの新規ジョブ投入はキャラクターを含め全て停止中です。非キャラクター素材はChatGPT画像生成を使用し、ComfyUI製背景/道具候補はランタイム参照・プレビュー出力から除外しています。
- v03素材は `concept_review` またはそれ以前の候補状態で、approvedではありません。既存のランタイムmanifestにある `draft` 素材も出荷承認を意味しません。
- 仕様17 §6に合わせ、`npm run build` はランタイム必須アセットのmanifest状態と権利記録がすべて承認済みの場合だけ `dist/` へ配布ビルドを作る。承認ゲートが失敗した場合は古い `dist/` も削除する。`npm run build:preview` は候補を `dist-preview/` へ出し、配布先と分ける。現在の必須アセットは未承認のため配布ビルドは停止する。
- 2026-11-23確認: `npm run build:preview` は82個のランタイム参照アセットで成功。タイトル背景v08の2560×1440 WebPと新しい参照先を `dist-preview/` へ含めた。previewは未使用候補をコピーせず、ランタイムリストにComfyUI製の非キャラクター画像が入れば停止する。`npm run build` は状態/ライセンス確認164件で停止し、`dist/` を残さないことを確認。承認作業自体は残る。
- かつめし完成皿の新規生成は保留。ランク別AI生成皿をランタイムから外し、タイトル・完成画面・試食でユーザー提供のwhole素材に統一。sliced素材は画像端が欠けているため未使用。

## 残作業

1. 実画面合成は `artifacts/screenshots/*_staged.png` の証跡で一部確認済み: TITLE/MORNING/SHOP/COOK/REACTION/RESULT/UPGRADEを1280×720と1920×1080で取得。document/viewport寸法一致、画像読込失敗0、JSページエラー0。REACTION/UPGRADEの1280×720を目視し、主要要素の欠けなし。1600×900/1366×768、縦長表示、全工程/全ランク/全表情の比較、細部の採用レビューは未完。`AGENTS.md` に従いComputer Useは起動していない。
2. 画像マスターの寸法はdocs/17 §5と不一致がある。食材アイコンの実行WebPは256×256pxへ統一済み。背景はChatGPT生成の元画像が1672×941で、原寸基準2560×1440に未達。拡大しても細部は復元できないため、原寸品質の確認・改善が必要。
3. BGM/SEのピーク目標・形式・ループ端は数値確認済み。実機で聴取し、聞きやすさと音量ミックスをレビューする。
4. 完成料理canonicalと依存するたれ外観差分はユーザー指示で保留。別手法の指定がない間は生成・差し替えをしない。
5. 素材の採用・ライセンス承認後に出荷ビルドを実行し、承認済み素材だけが含まれることを確認する。
6. P3の新v12候補は厨房背景に近い線画へ寄せたが、まだ光沢が強くconcept_review。原本1672×941で仕様の背景原寸2560×1440基準未達。ランタイムへ接続せず、実画面サイズ/合成レビューは未完。調理ステージCSSの16:9比率は画像原本と一致させた。

- 2026-11-23: プレビュー実行対象の素材レビューをまとめるローカルギャラリー `artifacts/runtime_asset_review.html` と生成スクリプト `scripts/build_runtime_asset_gallery.py` を追加。`dist-preview/` の現行82ファイルだけを表示し、ネストしたmanifestも参照して全件のレビュー状態を取得。現時点はconcept_review 81点、draft 1点で、承認済み素材は0点。これは目視レビューの入口であり、合成レビュー・ライセンス確認・採用承認を代替しない。
- 2026-11-23: 背景v08のコンタクトシートを目視し、タイトル/Day7の同一店舗と時間帯差、朝準備/P3厨房/試食/結果の用途別構図、営業背景v02の斜め俯瞰と中央通路を確認。7候補のmanifestに縮小シート上の所見を記録。すべてconcept_reviewを維持し、実画面合成/原寸ディテール/ライセンス確認は未完。
- 2026-11-23: P2のv06衣付き肉は256px表示でもピンク/濡れた斑点が残り、衣付け済み状態が弱いため、ChatGPT画像編集でv07候補を制作。パン粉で全面が覆われた未加熱の肉として見分けられることを256pxで目視し、manifestへ記録。P2と揚げ色比較のプレビュー参照をv07へ切替。素材はconcept_reviewのままで、画面合成・権利・採用確認は未完。完成料理/たれ差分は対象外。

- 2026-11-23 manifest監査: `public/assets/game/` 内の29 manifestを確認。キャラクターv05は各項目の `reviewStatus: concept_review`、料理v06等は `status: concept_review` で、候補を承認済みとして扱っていない。食材v02と店主v04の一部manifestは旧形式（`approval` や `files` 配列）なので、新形式の共通キーだけで機械判定しない。ルートmanifestの画像113点はすべて参照先が存在し、寸法不一致1点（worker B）を実測1293×1216へ修正した。旧店主v04参考素材3点（`owner_design_sheet_v01.png`、`owner_expression_sheet_v01.png`、`owner_shop_back_v01.png`）のsource PNGは現在の作業ツリーにない。これらは現行ランタイム素材ではなく、復元・差し替えは行っていない。

- 2026-11-23追加: Chromiumバイナリが見つからず一度失敗したが、インストール済みMicrosoft EdgeをPlaywrightの実行ブラウザに指定して確認。TITLE/MORNINGを1920×1080で撮影し、MORNINGはdocument/bodyとも1920×1080、画像読込失敗0件、画面外要素0件を確認。初回表示のフレーム遅延を一時停止扱いしてしまう誤動作を再現したため、タブ非表示/フォーカス喪失は既存の明示処理に任せ、通常のフレーム遅延は1更新あたり最大0.3秒に制限した。再撮影でMORNINGに一時停止ダイアログがないことを確認。証跡 `artifacts/screenshots/title_1920x1080_audit.png` と `morning_1920x1080_audit.png`。

- 2026-11-23追加: 仕様17 §2/§3の試食・反応画面に必要な「店内背景のぼかし差分」が共用背景のまま残っていたため、ChatGPT画像生成で人物・料理・文字のない専用候補 `tasting_interior_chatgpt_v01` を制作。中央に評価UIとキャラクターを置く余白を取り、原本PNGを `assets/source/imagegen/chatgpt/v06/backgrounds/`、実行WebPを `public/assets/game/backgrounds/v06/` に保存し、REACTION画面へ接続した。生成画像は1672×941で、仕様17 §5の2560×1440原寸基準には未達。concept_reviewのため採用・実画面合成レビューは未完。プレビュービルドには含め、ComfyUI非キャラクター素材除外数は14のまま。

- 2026-11-23 キャラクター表情の追加レビュー: ComfyUI＋anima-style LoRAで常連客のC/Fを控えめにした比較候補を2点制作。比較シート `artifacts/regular_low_rank_review_v103.jpg` で、現行版より評価トーンが弱く、v102より顔立ちと構図が現行C/Fに近いことを比較シートで確認。v05画像を初期画像にし、denoise 0.30/0.36で生成したv103をプレビューのC/Fへ切替。原本PNG・透過マスク・条件・LoRA・seed・promptを候補manifestに記録。残る確認は6ランク間の表情連続性、実画面合成、権利/配布承認。

- 2026-11-23追加: 背景レビューシートでChatGPT生成の旧朝/営業/厨房が写実的3D調に寄り、キャラクター画風と不整合と判断。非キャラクター素材はChatGPT画像生成を使い、同一の2D手描き/セル塗り参考画像で朝準備・営業・厨房・試食・結果の5背景v07を作り直した。`assets/source/imagegen/chatgpt/v07/backgrounds/` に原本PNG、`public/assets/game/backgrounds/v07/` にWebP/manifestを登録し、5画面で参照切替。比較シートは `artifacts/backgrounds_chatgpt_review_v07.jpg`。原本は1672×941のため2560×1440基準には未達、concept_reviewのまま。

- 2026-11-23追加: 営業背景を参照し、ChatGPT画像生成へネイティブ2560×1440を指定した解像度検証を実施。出力は1672×941だったため仕様寸法を満たさず、`assets/source/imagegen/chatgpt/v07/backgrounds/shop_diner_anime_chatgpt_v02_resolution_attempt.png` とJSON記録だけ保存し、ランタイムへは接続していない。背景の原寸基準未達は継続課題。
- 2026-11-23追加: 既存の肉たたき/トレイ/鍋/レードル/しゃもじ/フライヤー/椅子は3D商品レンダー調で、新v07背景・キャラクター素材と画風が不一致。ChatGPT画像生成で手描き2D・透明背景の道具5点/設備2点を作り、各工程見本と設備カードの参照を更新。原本/最終promptは `assets/source/imagegen/chatgpt/v07/`、実行WebP/manifestは `public/assets/game/cooking/v07/tools/` と `public/assets/game/equipment/v07/`、比較シートは `artifacts/tools_equipment_chatgpt_v07.png`。1024×1024、concept_review。縮小表示・実画面合成・採用と権利確認は残る。

- 2026-11-23画面監査補足: `src/stage.mjs` がHTMLから未読込だった問題を修正し、`html.staged` による1920×1080座標系と画面別スタイルを有効化。7画面（TITLE/MORNING/SHOP/COOKING/REACTION/RESULT/UPGRADE）を1920×1080・1280×720で取得し、画像読込失敗0、JSページエラー0、document/viewport寸法一致を確認。REACTION/UPGRADEの1280×720を目視し、主要要素の欠けや画面外へのはみ出しなし。キャプチャは `artifacts/screenshots/*_staged.png`。本確認は各工程・各ランクの網羅検証や、すべてのアセットの採用承認を意味しない。
- 2026-11-23追加: SHOP背景v10を店主左/注文UI中央/客席右の画面構図に合わせて制作し、プレビュー実行対象へ接続。sourceは1672×941、2560×1440実行WebPはLanczos拡大であり原寸要件未達。`concept_review`、出荷不可。実画面合成の目視、キャラクターとの画風・前後関係、原寸品質の改善は未完。前段階のv09絵柄試作は `assets/source/imagegen/chatgpt/v09/backgrounds/` に保持し、ランタイム未接続。
- 2026-11-23追加: SHOP背景v10の原本を単体で目視し、左の店主用余白、中央の注文UI用床、右側の客席、奥のカウンターが配置意図どおりであることを確認。イラストの暖色線画も食堂設定に合う。実画面上の店主/注文カードとの重なり・可読性は未確認、原本は1672×941、concept_reviewを維持。所見をmanifestへ記録。
- 2026-11-23追加: `artifacts/screenshots/shop_1280x720_staged.png` で店主立ち絵とSHOP背景の画風差・UI重なりを再確認。既存v10候補より左を暗く簡素にし、中央を広い床、右端を客席、奥をカウンターとしたChatGPT生成v11候補を制作。生成PNG/条件は `assets/source/imagegen/chatgpt/v11/backgrounds/`、実行WebP/manifestは `public/assets/game/backgrounds/v11/`。`src/main.mjs` とpreview buildのasset listをv11へ切替。元画像は1672×941、実行版は2560×1440へLanczos拡大。候補単体ではレイアウトを確認したが、実画面再撮影・合成判定は未完。concept_reviewであり採用・配布承認ではない。
- 2026-11-23追加: 既存の設備画面1280×720キャプチャ `artifacts/screenshots/upgrade_1280x720_staged.png` でフライヤー/椅子のイラストがカード見出し内で小さかったため、`src/styles.css` の `.upgrade-icon` を3.5remから5remへ拡大。画像素材は変更せず、1024角の設備アイコンをUI上で読み取りやすくする調整。更新後のキャプチャ確認は未実施のため、画面合成の最終判定は保留。
- 2026-11-23追加: 画面で使うⓘ/☰/↻/▶/▼/◀/✓/✔/★/🧪/➜の記号を `src/icons.mjs` のSVGセットへ追加し、既存の描画層置換でUIフォント差を抑えた。デバッグ用試験管も含め、main.mjs内の操作記号を対象にした。アクセシブル名はSVGに置換しない。比較シート `artifacts/ui_symbol_review_v01.png` で新規記号の輪郭と意味が読み取れることを確認し、再生成スクリプト `scripts/build_ui_symbol_review.py` を追加。`src/main.mjs` の表示用記号を静的走査し、未登録記号0を確認。実画面の縮小表示・色コントラスト確認は未完。仕様定義を `docs/06` UIデザイントークン節へ追記。
- 2026-11-23追加: WCAG 2.2 SC 1.4.3 の通常文字4.5:1目安で基本配色を数値点検。旧成功緑 `#4f8a3a` はクリーム面で3.95:1、暖色面で3.42:1だったため、小さい評判/結果文字向けに `--state-success:#3d702d` へ調整（同面5.59:1/4.83:1）。中立評価の旧 `#c07a12` は3.29:1/2.85:1だったため `--state-warning:#865800` へ調整（5.83:1/5.04:1）。`src/stage.css` の評価色を状態tokenへ統一。通常本文/補助文字はクリーム面で12.09:1/5.87:1、危険色は6.18:1。合成背景上の実画面評価は未実施で、適合宣言ではない。基準と合成確認条件を `docs/22_UI_ACCESSIBILITY_AND_INPUT.md` に追記。
- 2026-11-23追加: `docs/22` が要求する18px本文/16px補助文字と「画面全体を縮小しない」に対し、旧 `src/stage.mjs` は1280×720で1920×1080全体を0.667倍にしていたことを確認。ステージ適用条件を1920×1080以上へ変更し、それ未満は流動レイアウトへ切替。1280〜1919px横長の基準文字を18px、主要補助文字を16px以上にするCSS下限を追加。プレビュービルド/モジュール構文確認は成功。既存の1280/1600キャプチャは変更前のステージ版であり、現行の流動表示に対する証跡ではない。Computer Useは起動していないため、更新後の表示崩れ/画面内配置レビューは未完。
- 2026-11-23追記: 境界条件の1920×900など、幅は1920px以上でも固定ステージ条件を満たさない横長画面にも文字下限が必要。`stage.mjs` が非ステージ横長・幅1280px以上に `fluid-landscape` を付け、CSSの18px本文/16px補助文字規則を適用するよう統一。現行コードの画面合成レビューは未実施。

- 2026-11-23 P3改善候補: 過去候補の油面との融合を受け、ChatGPT画像生成でカツを油から持ち上げ、厚みのある側面が見える1点を作成。v09 source manifestとruntime v08 manifestへプロンプト/参照/権利/レビュー状態を記録し、COOK P3のプレビュー参照を更新。元画像1672×941、concept_review。ゲーム内表示サイズでの構図適合と最終採用は未確認。ComfyUIは使っていない。

- 2026-11-23 P3 v13候補: ChatGPT画像生成で既存P3候補を編集し、単一の平たいカツを箸で持ち上げる構図を保ちながら、太い輪郭・簡略化したパン粉・2段階のセル影へ変更。原本とprompt、参照、寸法、利用条件、レビュー状態は `assets/source/imagegen/chatgpt/v13/cooking/manifest.json` に記録。原本1672×941 RGB、`concept_review`。形状と線の明瞭さは確認したが、実画面縮小/合成レビューと採用判断は未実施。プレビュー参照とビルド対象へ接続済み。ゲーム内縮小/合成レビューと採用判断は未実施。ComfyUIは使用していない。

- 2026-11-23 Tier 1実装: 起動時のconfig検査を未接続から実装へ変更。起動時とbuild開始時に設定schemaを読み込み、schema検査とゲーム数値不変条件を確認する。schemaの `oneOf`、配列 `prefixItems`、セーブ日時の暦日/時刻/タイムゾーン形式の判定も追加。実際のS01〜S24検証・テストベクトル照合は未実施。

- 2026-11-23 Tier 1セーブ相互条件: Day1専用時計と通常日時計、固定8件チュートリアル注文、通常日の来客予定残数が一致するかを `validateSave` で照合。`openingRemainingSeconds=null` による通常日の閉店不能や、到着カウンター不整合を拒否する。構文・プレビューbuildで確認。

- 2026-11-23 SHOP背景v14候補: ChatGPT画像生成で輪郭線とセル影を強めた2D候補を1点作成し、source manifestへ記録。原寸1672×941のため背景原寸要件は未達。中央床の線と注文UIの干渉が未評価で、プレビュー/ランタイムには未接続。ComfyUIは使用していない。

- 2026-11-23 Tier 1注文不変条件: 当日注文の件数と採番、ID連番、Day1の固定客順をセーブ検証へ追加。欠落/順序不整合セーブによる客順の飛びや注文数のずれを拒否する。構文・プレビューbuildで確認。

- 2026-11-23 S23補強: IndexedDB保存が遅延している間の定期保存要求を抑え、ゲーム内2秒間隔を維持しつつ書き込みキューの増大を防止。重要操作の保存は直列化を維持。構文・プレビューbuildで確認。強制終了を伴うE2E検証は未実施。

- 2026-11-23 セーブ/会話イベント不変条件: activeStoryEventIdがストーリー定義にあり、イベントday/triggerとセーブday/phaseが一致し、既読ではないことを検証。誤ったイベント状態でのソフトロックや会話再演を防ぐ。構文・プレビューbuildで確認。実ロードE2Eは未実施。

- 2026-11-23 S14 commandId補強: ページセッションUUID+連番で識別し、時刻ミリ秒とカウンターだけから生じる再読込/複数タブのID衝突余地を低減。構文・プレビューbuildで確認。複数タブ競合試験は未実施。

- 2026-11-23 通常日到着スケジュール不変条件: 保存候補配列の10〜14件の範囲、残数との一致、発行済み候補=生成注文+満員逸失数、到着秒の固定算出式、MORNING時の未発行状態を検証。壊れた予定時刻による来客順/営業進行のずれをロード前に拒否する。構文・プレビューbuildで確認。

- 2026-11-23 Day1チュートリアル台帳: `tutorialNextOrderIndex===orders.length` を相互条件に追加し、固定8客の順序/残り数だけでなく発行済み件数も一致することを検証。構文・プレビューbuildで確認。

- 2026-11-23 会計/閉店不変条件: 閉店時にconfigの固定費と給与をそれぞれ台帳・現金へ一度だけ反映し、保存検証でも閉店状態との金額整合を確認。現行給与0円のS01収支は維持。構文・プレビューbuildで確認。

- 2026-11-23 支援回数不変条件: `aidGrantedDay` を未使用(null)か当日のマーカーに限定し、誤った日付の保存値による一日一回制限のずれを防止。構文・プレビューbuildで確認。

- 2026-11-23 設備投資台帳不変条件: 解放設備の購入費合計とcareer/daily投資台帳を照合し、当日購入額はUPGRADE画面でのみ有効にした。仕様10/11の購入・翌日反映、台帳加算漏れ/重複をロード前に検出する。構文・プレビューbuildで確認。

- 2026-11-23 P4採点不変条件: 完了セーブ/提供結果のP4をconfig固定値20点と照合。開発用ランク強制も固定P4点と有効なP6配置を使い、P4加減点/配置点不一致を排除。構文・プレビューbuildで確認。

- 2026-11-23 給与表示: `payrollYenPerDay>0` の場合のみRESULTへ給与内訳を表示するtextKeyを追加。現行設定0円では画面表示を変えない。構文・JSON・プレビューbuildで確認。
- 2026-11-23 設備設定検証: JSON Schemaはフライヤー/椅子のID集合と要素数を制限するが、同一IDの重複を許していた。`validateConfig` に固有ID、価格、有効日、効果の仕様16照合を追加。設定の設備定義が欠落/重複/誤設定なら起動とbuildを失敗させる。構文・preview buildで確認。
- 2026-11-23 セーブ設備購入日検証: `unlockedUpgradeIds` に購入費台帳との一致だけでなく、現日程から購入可能日（有効日の前営業日のUPGRADE以降）を過ぎているか照合する条件を追加。Day1の椅子先行購入などを拒否。構文・preview buildで確認。
- 2026-11-23 EVENT overlay同期: `queueStory`、DISMISS_STORY、ロード復帰をEVENT overlayとactiveStoryEventIdに同期し、save validationでeventId不一致/PAUSEとの重複を拒否。従来はJSON SchemaでEVENTを許容しながらdomainが生成せず、ロード時PAUSEと会話の二重表示を起こし得た。構文・JSON・preview buildで確認。
- 2026-11-23 会話セーブ移行: 既存保存データに会話IDだけがある場合、読み込み時に対応するEVENT overlayを再構成。現在形式ではactiveStoryEventIdとEVENT overlayが片側だけ存在するセーブを拒否。
- 2026-11-23 config/実装整合: 仕入れ数量とP2の区画数/セル数/キーボード長押し秒をUI・ドメインの値源とschemaで統一。通常日の到着スケジュールは設定のfirstSecond/spreadSecondsを使用し、候補時間が営業時間を超えるconfigを起動/build時に拒否する。
- 2026-11-23 MORNING時計不変条件: MORNINGのbusinessElapsedSeconds=0と通常日のopeningRemainingSeconds=config.normalDay.businessSecondsを保存検証へ追加。開店前時計が進んだ壊れたセーブを拒否する。
- 2026-11-23 チュートリアル保存不変条件: Day1のtutorialStepをphase別に照合し、Day2の継続stepはMORNINGだけ、Day1のtutorialFirstServedは提供済み注文有無と一致することを検証する。
- 2026-11-23 Day7設定整合: 実装で固定している節目イベントに合わせ、設定のmvpMilestone.day=7および継続プレイ可を設定検証へ追加。
- 2026-11-23 実装状況記述の更新: docs/24の既知制限に残っていた「食材・設備アイコンは絵文字」という旧説明を、実際のChatGPT生成v06/v07画像素材とconcept_review/権利確認待ちの状態へ修正。盛り付け部品は元データこそ絵文字だが、`src/icons.mjs` の描画置換により表示時は食品SVGとなる点も記録。
- 2026-11-23追加確認: runtime音声manifestと15本のWAVを照合。44.1kHz/stereo/PCM16に加え、15本すべての実時間がmanifest記録と一致。聴感・ゲーム内ミックスの承認は未完。


## タイトル背景候補の追加（2026-11-23）
ChatGPT画像生成でタイトル背景v04を追加。既存参考の川/橋を左、食堂を右とする配置およびロゴ/メニュー用の空域を維持した。原画は1672×941で、仕様17 §5の2560×1440を満たさない。拡大しても原画ディテールは増えないため、ランタイムへ接続せずconcept_reviewのまま保留。完成料理やたれ差分は生成していない。

- 2026-11-23 P3候補v16: ChatGPT画像生成で網じゃくし上のカツが油面から明確に離れた工程背景を作成。上右に説明UI用の余白を確保。単体目視では切り抜きの輪郭は識別可能。原画1672×941のため2560×1440原寸基準未達、実画面合成/権利/採用レビュー未完。source manifest ssets/source/imagegen/chatgpt/v16/cooking/manifest.json、候補のためランタイム未接続。

- 2026-11-23 P6入力整合: 仕様14の誤順序配置を確定して0点で続行する契約に対し、UIが次の部品以外を選べなかったため修正。未配置4部品を選択可能にし、順序と得点ルールを画面文言で案内。

- 2026-11-23 P6採点追補: 表示順に対し部品配置順を検査し、正しい部品かつ正しい皿位置のときのみ加点。誤順序/誤位置は0点で続行。

- P6採点整合追補: 保存検証が旧式（部品と位置のみ一致）だったため、工程順序も照合する式に統一。

- UI仕様文言整合: OPENの待機/共通ヒントにあった自動調理の誤案内を、注文カードを選択する説明へ修正。P3得点0では目標時刻から外れた旨を画面表示・読み上げ通知する。

- セーブ/ストーリー整合: 未読の必須会話を対応phaseのセーブから欠落させられたため、未読必須イベントはactive ID必須、既読IDは一意かつ定義済みと検証する。

- ストーリー保存検証追補: 必須会話を未読のまま後続phase/日へ進行したセーブも無効化し、イベント欠落による進行スキップを防止。

- ストーリー検証追補: 既読会話IDは現在のday/phaseまでに到達したイベントに限定し、未来会話を既読扱いにするセーブを拒否。

- 通常日セーブ/再現性: 到着indexに対するPRNG状態と抽選客種、処理済み候補時刻と各注文作成時刻を照合する検証を追加。候補抽選の保存ずれをロード前に検出。

- 参照回帰監査: src/game-assets.mjs の食材/工程パスが ood/v08real のComfyUI候補へ戻っていたため、ChatGPT v06/v07の参照へ復元。preview buildで82 runtime assets成功、ComfyUI非キャラクター生成除外を確認。
