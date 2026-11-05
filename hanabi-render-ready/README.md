# HANABI Online — Render公開版

## ローカル起動 (Windows PowerShell)

```powershell
npm.cmd install
npm.cmd run dev
```

ブラウザで表示されたViteのURLを開いてください。開発時はViteとSocket.IOサーバーが同時に起動します。

## Renderに公開

1. GitHubに新規リポジトリを作成し、このフォルダのファイルを**リポジトリ直下**にアップロードします。`node_modules` はアップロードしません。
2. RenderのDashboardから **New → Blueprint** を選び、GitHubリポジトリを接続します。
3. `render.yaml` が認識されたらデプロイを実行します。無料プランが選択可能か、画面の表示を確認してください。
4. デプロイ完了後、Renderに表示される `https://...onrender.com` のURLを友達に共有します。

## 注意

- ルームと対局データはサーバーメモリ内のみです。再起動・スリープ・再デプロイで失われます。
- 戦績の永続保存とリプレイの完全な状態再生は未実装です。
- 同じ端末のタブで試す場合は、タブごとに異なる表示名を入力してください。
- このバージョンは試験公開向けです。公開ルームの認証・レート制限等は今後追加が必要です。
