import { createServer } from 'node:http';
import { renderStatusPage } from './status';

// 用法：
//   pnpm sandbox          -> 於 127.0.0.1 啟動健康狀態頁（預設埠 5174，可用 SHINUAN_SANDBOX_PORT 覆寫）
//   pnpm sandbox --once   -> 只輸出一次 HTML 後結束（供工具鏈驗證）
const html = renderStatusPage();

if (process.argv.includes('--once')) {
  console.log(html);
} else {
  const port = Number(process.env['SHINUAN_SANDBOX_PORT'] ?? 5174);
  createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  }).listen(port, '127.0.0.1', () => {
    console.log(`shinuan local-sandbox listening on http://127.0.0.1:${port}/`);
  });
}
