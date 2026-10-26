(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let loading = 0;
  const minutes = ms => Math.round(Number(ms) / 60000);
  const dateFormat = new Intl.DateTimeFormat('he-IL', {timeZone:'Asia/Jerusalem',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  async function api(path, method = 'GET', data) {
    const result = await fetch('/api/admin/' + path, {method,credentials:'same-origin',cache:'no-store',
      headers:method === 'GET' ? {} : {'Content-Type':'application/json'},body:data === undefined ? undefined : JSON.stringify(data)});
    if (result.status === 401) { location.assign('/signin-with-chatgpt?return_to=%2Fadmin'); throw new Error('נדרשת כניסת מנהל'); }
    if (!result.ok) throw new Error(result.status === 403 ? 'אין הרשאה לצפות בנתונים.' : 'הפעולה לא הושלמה. נסו שוב.');
    return result.json();
  }
  function cell(row, text, className) { const el = document.createElement('td'); el.textContent = text; if (className) el.className = className; row.append(el); return el; }
  async function load() {
    const current = ++loading;
    $('admin-status').textContent = 'טוען נתונים…';
    try {
      const data = await api('students?days=' + $('period').value);
      if (current !== loading) return;
      const totals = data.students.reduce((sum,s) => ({active:sum.active + Number(s.active_ms),completed:sum.completed + Number(s.completed),students:sum.students + Number(s.active_ms > 0 || s.answers > 0 || s.completed > 0)}), {active:0,completed:0,students:0});
      $('metric-students').textContent = `${totals.students} / ${data.students.length}`;
      $('metric-time').textContent = minutes(totals.active).toLocaleString('he-IL');
      $('metric-completed').textContent = totals.completed.toLocaleString('he-IL');
      $('students').replaceChildren();
      $('empty').hidden = data.students.length > 0;
      for (const student of data.students) {
        const row = document.createElement('tr');
        const name = cell(row,student.label,'student-name');
        if (student.revoked) { const status = document.createElement('span'); status.className = 'student-state'; status.textContent = 'המעקב הופסק'; name.append(status); }
        cell(row,student.last_seen ? dateFormat.format(student.last_seen) : 'טרם השתמש');
        cell(row,minutes(student.active_ms) === 1 ? 'דקה אחת' : minutes(student.active_ms) + ' דקות'); cell(row,student.answers); cell(row,student.completed);
        const actions = cell(row,''); const group = document.createElement('div'); group.className = 'row-actions'; actions.append(group);
        function button(label, className, action) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = className; b.setAttribute('aria-label',label + ' · ' + student.label);
          b.onclick = async () => { b.disabled = true; try { await action(); } catch(error) { $('admin-status').textContent = error.message; } finally { b.disabled = false; } }; group.append(b);
        }
        if (!student.revoked) {
          button('הפסקת מעקב','',async () => { if (confirm('להפסיק מעקב אחר ' + student.label + '? הנתונים הקיימים יישמרו.')) { await api(`students/${student.id}/revoke`,'POST',{}); await load(); } });
        }
        button('מחיקה','delete',async () => { if (confirm('למחוק לצמיתות את ' + student.label + ' ואת כל נתוני המעקב שלו?')) { await api(`students/${student.id}`,'DELETE'); await load(); } });
        $('students').append(row);
      }
      renderChart(data.daily, data.days);
      $('admin-status').textContent = 'עודכן: ' + dateFormat.format(Date.now());
    } catch(error) { if (current === loading) $('admin-status').textContent = error.message; }
  }
  function renderChart(daily, days) {
    const chart = $('activity-chart'); chart.replaceChildren();
    const values = new Map(daily.map(d => [d.day,Number(d.active_ms)]));
    const dayFormat = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'});
    const today = new Date(dayFormat.format(Date.now()) + 'T00:00:00Z');
    // Seven-day chart stays legible; longer periods use chronological weekly bins.
    const bins = [], width = days === 7 ? 1 : days === 30 ? 5 : 15;
    for (let offset = days - 1; offset >= 0; offset -= width) {
      let total = 0, first;
      for (let i=0;i<width && offset-i>=0;i++) { const calendar = new Date(today); calendar.setUTCDate(calendar.getUTCDate() - (offset-i)); const day = calendar.toISOString().slice(0,10); if (!first) first=day; total += values.get(day)||0; }
      bins.push({label:first.slice(8) + '.' + first.slice(5,7), total});
    }
    const max = Math.max(60000,...bins.map(b => b.total));
    for (const bin of bins) {
      const column = document.createElement('div'); column.className = 'day-column';
      const value = document.createElement('span'); value.className = 'day-value'; value.textContent = minutes(bin.total);
      const bar = document.createElement('div'); bar.className = 'day-bar'; bar.style.height = Math.max(2,140*bin.total/max) + 'px';
      const label = document.createElement('span'); label.textContent = bin.label; column.append(value,bar,label); chart.append(column);
    }
    chart.setAttribute('aria-label', `${days === 7 ? 'דקות לפי יום' : 'דקות בקבוצות של ' + width + ' ימים'}: ` + bins.map(b => b.label + ': ' + minutes(b.total)).join(', '));
  }
  $('period').onchange = load; $('refresh').onclick = load;
  void load();
})();
