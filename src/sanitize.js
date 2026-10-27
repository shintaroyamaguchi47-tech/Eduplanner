// ノート・週メモの HTML を画面に戻す前に無害化する。
// 保存データは Firestore・バックアップJSONの復元・貼り付けなど外から入ってくるので、
// <img onerror=...> や <script> のように開いただけで動くものを取り除き、書式（太字・色・画像など）だけを残す。
// DOMParser で作った文書は画像の読み込みもスクリプトの実行もしないので、解析中に何かが動くことはない。
// tests/sanitize.test.mjs で単体テストしている。

// 中身ごと捨てる要素
const SANITIZE_DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'link', 'meta', 'base',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'svg', 'math', 'template', 'noscript', 'title',
  'audio', 'video', 'source', 'track', 'canvas', 'portal',
]);
// そのまま残す要素。ここにないものはタグだけ外して中身の文字を残す
const SANITIZE_ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'span', 'font', 'div', 'p', 'br', 'hr', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'img', 'a',
]);
const SANITIZE_ALLOWED_ATTRS = new Set(['style', 'color', 'face', 'size', 'align', 'src', 'alt', 'href', 'title', 'colspan', 'rowspan', 'width', 'height']);

const isSafeImageSrc = (v) => /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(v) || /^https:\/\//i.test(v);
const isSafeHref = (v) => /^(https?:|mailto:|tel:)/i.test(v);

const cleanSanitizedNode = (node) => {
  Array.from(node.childNodes).forEach(child => {
    if (child.nodeType === 3) return;
    if (child.nodeType !== 1) { child.remove(); return; }
    const tag = child.tagName.toLowerCase();
    if (SANITIZE_DROP_TAGS.has(tag)) { child.remove(); return; }
    cleanSanitizedNode(child);
    if (!SANITIZE_ALLOWED_TAGS.has(tag)) { child.replaceWith(...child.childNodes); return; }
    Array.from(child.attributes).forEach(({ name, value }) => {
      const n = name.toLowerCase();
      const v = value.trim();
      const ok = SANITIZE_ALLOWED_ATTRS.has(n)
        && !(n === 'src' && !isSafeImageSrc(v))
        && !(n === 'href' && !isSafeHref(v))
        && !(n === 'style' && /expression\s*\(|javascript:|url\s*\(/i.test(v));
      if (!ok) child.removeAttribute(name);
    });
    if (tag === 'img' && !child.getAttribute('src')) { child.remove(); return; }
    if (tag === 'a') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer'); }
  });
};

// 何も実行しない別文書の <body> として解析する。一覧のプレビュー（文字だけ・画像の有無）にもこれを使う
const parseInertHtml = (html) => new DOMParser().parseFromString(String(html || ''), 'text/html').body;

const sanitizeHtml = (html) => {
  if (!html) return '';
  const body = parseInertHtml(html);
  cleanSanitizedNode(body);
  return body.innerHTML;
};
