// 公開用ビルドで index.html から使っているクラスだけを集めたCSSを作る（開発時の Tailwind CDN と同じ設定）
module.exports = {
  darkMode: 'class',
  content: ['./index.html'],
};
