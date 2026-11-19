const schema = require('./schema');

const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function setPath(obj, p, v) {
  const keys = p.split('.');
  let o = obj;
  keys.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; });
  o[keys[keys.length - 1]] = v;
}

// Turns the flat form data (keys like "location.district") into a clean nested document.
function sanitize(col, body) {
  const out = {};
  const errors = [];
  for (const f of schema[col].fields) {
    const v = body[f.name];
    const blank = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (blank) {
      if (f.required) errors.push(`${f.label} is required`);
      setPath(out, f.name, f.type === 'array' ? [] : null);
      continue;
    }
    switch (f.type) {
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) errors.push(`${f.label} must be a number of 0 or more`);
        else setPath(out, f.name, n);
        break;
      }
      case 'date': {
        const d = new Date(v);
        if (isNaN(d.getTime())) errors.push(`${f.label} is not a valid date`);
        else setPath(out, f.name, d);
        break;
      }
      case 'array': {
        const arr = (Array.isArray(v) ? v : String(v).split(','))
          .map(s => String(s).trim()).filter(Boolean);
        setPath(out, f.name, arr);
        break;
      }
      case 'select':
        if (!f.options.includes(v)) errors.push(`${f.label} must be one of: ${f.options.join(', ')}`);
        else setPath(out, f.name, v);
        break;
      default:
        setPath(out, f.name, String(v).trim());
    }
  }
  return { out, errors };
}

module.exports = { sanitize, getPath, setPath };
