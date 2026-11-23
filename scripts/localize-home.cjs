// Resolve language content at build time, preserving raw script/style bodies.
const voids = new Set('area base br col embed hr img input link meta param source track wbr use path circle rect line polyline polygon ellipse stop'.split(' '));
module.exports = function localize(html, en) {
  const inactive = en ? 'ar' : 'en';
  const tokens = html.match(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<![^>]*>|<\/?[a-z][^>]*>|[^<]+|</gi) || [];
  let output = '', depth = 0, option = null;
  for (let token of tokens) {
    const start = token.match(/^<([a-z][\w:-]*)\b/i);
    const end = /^<\//.test(token);
    const atomic = /^<(script|style)\b/i.test(token);
    const closed = start && (voids.has(start[1].toLowerCase()) || /\/\s*>$/.test(token));
    if (depth) {
      if (end) depth--;
      else if (start && !atomic && !closed) depth++;
      continue;
    }
    if (start && !atomic) {
      const classes = token.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) || [];
      if (classes.includes(inactive)) { if (!closed) depth = 1; continue; }
      if (en) {
        for (const [from, to] of [['data-alt-en','alt'],['data-aria-en','aria-label'],['data-placeholder-en','placeholder']]) {
          const value = token.match(new RegExp('\\b'+from+'="([^"]*)"'))?.[1];
          if (value !== undefined) token = token.replace(new RegExp('(?<![\\w-])'+to+'="[^"]*"'), to+'="'+value+'"');
        }
        if (start[1] === 'option') option = token.match(/\bdata-en="([^"]*)"/)?.[1] ?? null;
        if (/\bid="themeBtn"/.test(token)) token = token.replace(/(aria-label|title)="[^"]*"/g, '$1="Switch to light theme"');
      }
      token = token.replace(/\sdata-(?:alt|aria|placeholder|project|service)-(?:ar|en)="[^"]*"/g,'').replace(/\sdata-en="[^"]*"/g,'');
    } else if (option !== null && !end && !token.startsWith('<')) { token = option; option = null; }
    output += token;
  }
  if (depth) throw Error('Unbalanced inactive-language markup');
  return output;
};
