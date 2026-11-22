# 仕様データの検証

v0.5の機械可読データは次の4つ。

- `mvp_config.json` — 実装時に初期値としてロードする、暫定ゲームバランスの唯一の機械可読ソース
- `mvp_config.schema.json` — configに要求されるJSON構造/範囲（JSON Schema Draft 2020-12）
- `mvp_save.schema.json` — セーブv1のJSON構造/値域。**相互状態の不変条件は別途ドメインで検証**
- `mvp_save_example.json` — Day1のMORNING状態のサンプル。実ゲームから生成されたセーブではない
- `mvp_test_vectors.json` — 固定計算、状態遷移、ガードのテストベクトル

## 静的チェック（ローカル、GitHub Actionsには依存しない）

```bash
python -m pip install -r requirements-spec.txt
python scripts/validate_specs.py
```

検証内容: JSON Schemaの構造/型/境界、合計原価430円、Day1基準会計、到着候補数、ランク別評価式、設備購入日、支援の補填方式等。**現時点でゲームコードがないため、実際の注文/調理/セーブのE2Eは検証できない**。このチェッカが成功してもゲームが完成したことにはならない。

## 実装で追加すること
1. reducerの遷移ガード、注文ID・commandIdの冪等性、dayフラグ整合をテストする。
2. ブラウザでIndexedDB main/backupの書込み失敗/復元をテストする。
3. P1〜P6と顧客の好みで計算されるスコアの比較を実ゲームで確認する。
4. 受け入れ項目は docs/23_QA_RELEASE_CONTRACT.md を参照。

## JSON Schemaの限界
schemaは必要最低限の個々のフィールド型・値域を確認する。注文が1件だけcookingであること、phase=COOKのactiveOrderIdがordersに存在すること、原価とwasteが一致すること、PRNGの消費位置の正しさまでは表せない。これらはドメイン不変条件として20に従う。
