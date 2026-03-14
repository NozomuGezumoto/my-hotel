# 携帯（Expo Go）がサーバーに繋がらないとき

## 1. LAN で繋ぐ（同じ Wi‑Fi）

### 確認すること
- **PC とスマホを同じ Wi‑Fi** にしている
- ルーターの「AP 隔離」「クライアント間通信オフ」などが **オフ**
- スマホで **Expo Go** を起動している

### 起動
```bash
npm run start
# または
npx expo start --lan -c
```

### 繋がらないとき：Windows ファイアウォールを許可
1. 「Windows セキュリティ」→「ファイアウォールとネットワーク保護」
2. 「アプリがファイアウォールを通過することを許可」
3. 「設定の変更」→ 一覧で **Node.js** にチェック（「プライベート」はオン）
4. 一覧に無い場合は「別のアプリの許可」から `node.exe` を追加し、「プライベート」をオン

### 手動で URL を入力
- ターミナルに `exp://192.168.x.x:8081` のように表示される
- スマホの Expo Go を開き「Enter URL manually」でその URL を入力

---

## 2. トンネルで繋ぐ（別ネットワーク・ファイアウォール越し）

同じ Wi‑Fi にできない・ファイアウォールで遮られる場合はトンネルを使います。

```bash
npm run start:tunnel
# または
npx expo start --tunnel
```

- 初回は Ngrok のセットアップで時間がかかることがあります
- `Cannot read properties of undefined (reading 'body')` が出る場合は、キャッシュ削除後に再実行：
  ```bash
  rmdir /s /q .expo 2>nul
  npx expo start --tunnel -c
  ```

---

## 3. ポートが変わったとき

「Use port 8082 instead?」で 8082 にした場合、Expo Go には **8082** の URL が表示されます。手動入力するときはポート番号を合わせてください。
