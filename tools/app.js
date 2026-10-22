/* Kindle Sudoku UI. ES5, no network, no timers that repaint. */
(function () {
  'use strict';

  if (!Date.now) {
    Date.now = function () { return new Date().getTime(); };
  }

  var KEY = 'kindleSudoku.v1';
  var LEVEL_IDS = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
  var STR = {
    tr: {
      title: 'Sudoku',
      newGame: 'Yeni oyun',
      cont: 'Devam et',
      stats: 'İstatistik',
      language: 'Dil',
      refresh: 'Ekranı tazele',
      refreshShort: 'Tazele',
      ready: 'Çevrimdışı hazır. Uçak modunu açın.',
      flying: 'Uçak modu açık. Çevrimdışı oynuyorsunuz.',
      wait: 'Sayfa bir kez kalsın, sonra uçak modunu açın.',
      confOn: 'Çakışma: açık',
      confOff: 'Çakışma: kapalı',
      who: 'Oyuncu adı',
      add: 'Bu adla devam et',
      pick: 'Kayıtlı oyuncular',
      back: 'Geri',
      needName: 'Oyuna başlamadan önce bir ad yazın.',
      noPlayers: 'Henüz oyuncu yok.',
      replace: 'Yarıda kalan oyun, yeni oyunun yerini alır.',
      notes: 'Not',
      notesOn: 'Not açık',
      erase: 'Sil',
      undo: 'Geri al',
      hint: 'İpucu',
      menu: 'Menü',
      mistakes: 'Hata',
      hints: 'İpucu',
      completed: 'Biten',
      best: 'En iyi',
      none: '—',
      done: 'Tamamlandı',
      again: 'Yeni oyun',
      home: 'Ana sayfa',
      changePlayer: 'Oyuncu değiştir',
      noHint: 'Bu konumdan mantık adımı çıkmadı.',
      levels: [
        { id: 'beginner', name: 'Başlangıç', about: 'Gizli ve çıplak tekler' },
        { id: 'easy', name: 'Kolay', about: 'Kutu-satır elemesi' },
        { id: 'medium', name: 'Orta', about: 'Çıplak ve gizli çiftler' },
        { id: 'hard', name: 'Zor', about: 'Üçlüler ve X-Wing' },
        { id: 'expert', name: 'Uzman', about: 'Swordfish ve XY-Wing' },
        { id: 'master', name: 'ZeyLevel', about: 'XYZ-Wing' }
      ]
    },
    en: {
      title: 'Sudoku',
      newGame: 'New game',
      cont: 'Continue',
      stats: 'Statistics',
      language: 'Language',
      refresh: 'Refresh screen',
      refreshShort: 'Refresh',
      ready: 'Offline ready. Turn on airplane mode.',
      flying: 'Airplane mode is on. Playing offline.',
      wait: 'Leave this page open once, then turn on airplane mode.',
      confOn: 'Conflicts: on',
      confOff: 'Conflicts: off',
      who: 'Player name',
      add: 'Continue with this name',
      pick: 'Saved players',
      back: 'Back',
      needName: 'Enter a name before the game starts.',
      noPlayers: 'No players yet.',
      replace: 'The unfinished game will be replaced.',
      notes: 'Notes',
      notesOn: 'Notes on',
      erase: 'Erase',
      undo: 'Undo',
      hint: 'Hint',
      menu: 'Menu',
      mistakes: 'Mistakes',
      hints: 'Hints',
      completed: 'Solved',
      best: 'Best',
      none: '—',
      done: 'Complete',
      again: 'New game',
      home: 'Home',
      changePlayer: 'Change player',
      noHint: 'No logical step from here.',
      levels: [
        { id: 'beginner', name: 'Beginner', about: 'Hidden and naked singles' },
        { id: 'easy', name: 'Easy', about: 'Box-line reduction' },
        { id: 'medium', name: 'Medium', about: 'Naked and hidden pairs' },
        { id: 'hard', name: 'Hard', about: 'Triples and X-Wing' },
        { id: 'expert', name: 'Expert', about: 'Swordfish and XY-Wing' },
        { id: 'master', name: 'ZeyLevel', about: 'XYZ-Wing' }
      ]
    }
  };

  var state;
  var view = '';
  var purpose = 'play';
  var sessionStart = 0;
  var lastResult = null;
  var boardCells = [];
  var notePx = 8;
  var offlineBound = false;

  function L() {
    return STR[state.lang] || STR.tr;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cleanName(s) {
    s = String(s || '').replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
    if (s.length > 20) s = s.substring(0, 20).replace(/\s+$/g, '');
    return s;
  }

  function blankStats() {
    var stats = {};
    var i;
    for (i = 0; i < LEVEL_IDS.length; i++) {
      stats[LEVEL_IDS[i]] = { completed: 0, bestMs: 0, mistakes: 0, hints: 0, seen: [] };
    }
    return stats;
  }

  function findPlayer(name) {
    var i;
    for (i = 0; i < state.players.length; i++) {
      if (state.players[i].name === name) return state.players[i];
    }
    return null;
  }

  function levelInfo(id) {
    var levels = L().levels;
    var i;
    for (i = 0; i < levels.length; i++) if (levels[i].id === id) return levels[i];
    return { id: id, name: id, about: '' };
  }

  function ensurePlayer(p) {
    var i, id, base;
    if (!p.stats) p.stats = blankStats();
    for (i = 0; i < LEVEL_IDS.length; i++) {
      id = LEVEL_IDS[i];
      base = p.stats[id] || {};
      p.stats[id] = {
        completed: base.completed || 0,
        bestMs: base.bestMs || 0,
        mistakes: base.mistakes || 0,
        hints: base.hints || 0,
        seen: base.seen && base.seen.length ? base.seen : []
      };
    }
    if (p.current) {
      if (!PUZZLES[p.current.level] || !PUZZLES[p.current.level][p.current.index]) p.current = null;
      else if (!p.current.values || p.current.values.length !== 81) p.current = null;
    }
  }

  function load() {
    var raw, data, i;
    state = { lang: '', checkConflicts: true, lastPlayer: '', players: [] };
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) return;
    try {
      data = JSON.parse(raw);
    } catch (e2) {
      return;
    }
    if (data.lang === 'tr' || data.lang === 'en') state.lang = data.lang;
    if (data.checkConflicts === false) state.checkConflicts = false;
    if (typeof data.lastPlayer === 'string') state.lastPlayer = data.lastPlayer;
    if (data.players && data.players.length) {
      state.players = data.players;
      for (i = 0; i < state.players.length; i++) ensurePlayer(state.players[i]);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function setLangAttr() {
    document.documentElement.lang = state.lang === 'en' ? 'en' : 'tr';
    document.title = 'Sudoku';
  }

  function setApp(html) {
    document.getElementById('app').innerHTML = html;
    document.body.className = view === 'game' ? 'play' : '';
    watchOffline();
  }

  function offlineHtml() {
    return '<p id="offline" class="offline"></p>';
  }

  function offlineText() {
    var lang = state.lang === 'en' ? STR.en : STR.tr;
    var online = true;
    var ready = false;
    try {
      if (navigator.onLine === false) online = false;
    } catch (e1) {}
    try {
      ready = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    } catch (e2) {}
    if (!online) return lang.flying;
    if (location.protocol === 'file:' || ready) return lang.ready;
    return lang.wait;
  }

  function watchOffline() {
    var el = byId('offline');
    if (!el) return;
    el.textContent = offlineText();
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready && navigator.serviceWorker.ready.then) {
        navigator.serviceWorker.ready.then(function () {
          var node = byId('offline');
          if (node) node.textContent = offlineText();
        });
      }
    } catch (e3) {}
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function formatMs(ms) {
    var s, m, h;
    if (ms < 0) ms = 0;
    s = (ms / 1000) | 0;
    m = (s / 60) | 0;
    h = (m / 60) | 0;
    s = s % 60;
    m = m % 60;
    function z(n) { return (n < 10 ? '0' : '') + n; }
    if (h > 0) return h + ':' + z(m) + ':' + z(s);
    return z(m) + ':' + z(s);
  }

  function cur() {
    var p = findPlayer(state.lastPlayer);
    return p ? p.current : null;
  }

  function flash() {
    var app = byId('app');
    var panel = byId('flash');
    app.style.display = 'none';
    panel.style.display = 'block';
    setTimeout(function () {
      panel.style.display = 'none';
      app.style.display = 'block';
      if (view === 'game') sizeBoard();
    }, 280);
  }

  function showLang() {
    view = 'lang';
    setApp(
      '<h1>Sudoku</h1>' + offlineHtml() +
      '<button type="button" id="tr">Türkçe</button>' +
      '<button type="button" id="en">English</button>' +
      '<button type="button" id="flashBtn">' + (state.lang === 'en' ? STR.en.refresh : STR.tr.refresh) + '</button>'
    );
    byId('tr').onclick = function () { chooseLang('tr'); };
    byId('en').onclick = function () { chooseLang('en'); };
    byId('flashBtn').onclick = flash;
  }

  function chooseLang(code) {
    state.lang = code;
    setLangAttr();
    save();
    showHome();
  }

  function showHome() {
    var player, html, lang;
    view = 'home';
    setLangAttr();
    lang = L();
    player = findPlayer(state.lastPlayer);
    html = '<h1>' + lang.title + '</h1>' + offlineHtml();
    if (player) html += '<p class="meta">' + esc(player.name) + '</p>';
    if (player && player.current) {
      html += '<button type="button" id="cont">' + lang.cont + ' (' + formatMs(player.current.elapsedMs) + ')</button>';
    }
    html += '<button type="button" id="new">' + lang.newGame + '</button>';
    html += '<button type="button" id="stats">' + lang.stats + '</button>';
    html += '<button type="button" id="lang">' + lang.language + '</button>';
    html += '<button type="button" id="conf">' + (state.checkConflicts ? lang.confOn : lang.confOff) + '</button>';
    html += '<button type="button" id="flashBtn">' + lang.refresh + '</button>';
    setApp(html);
    if (byId('cont')) byId('cont').onclick = function () { showGame(); };
    byId('new').onclick = function () { purpose = 'play'; showPlayers(); };
    byId('stats').onclick = function () {
      if (!state.players.length) {
        purpose = 'stats';
        showPlayers();
        return;
      }
      if (!findPlayer(state.lastPlayer)) state.lastPlayer = state.players[0].name;
      showStats();
    };
    byId('lang').onclick = showLang;
    byId('conf').onclick = function () {
      state.checkConflicts = !state.checkConflicts;
      save();
      showHome();
    };
    byId('flashBtn').onclick = flash;
  }

  function showPlayers() {
    var lang = L();
    var html = '';
    var i;
    view = 'players';
    html += '<h1>' + lang.who + '</h1>';
    if (purpose === 'play') {
      html += '<input id="name" class="name" type="text" maxlength="20" autocomplete="off">';
      html += '<button type="button" id="add">' + lang.add + '</button>';
      html += '<p id="err" class="err"></p>';
    }
    if (state.players.length) {
      html += '<p class="meta">' + lang.pick + '</p>';
      for (i = 0; i < state.players.length; i++) {
        html += '<button type="button" data-p="' + i + '">' + esc(state.players[i].name) + '</button>';
      }
    } else if (purpose === 'stats') {
      html += '<p class="meta">' + lang.noPlayers + '</p>';
    }
    html += '<button type="button" id="back">' + lang.back + '</button>';
    setApp(html);
    if (byId('add')) byId('add').onclick = submitName;
    if (byId('name')) {
      byId('name').onkeydown = function (e) {
        var code = e.keyCode || e.which || 0;
        if (code === 13 || e.key === 'Enter') {
          if (e.preventDefault) e.preventDefault();
          submitName();
        }
      };
    }
    var buttons = document.getElementById('app').getElementsByTagName('button');
    for (i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-p') !== null) {
        buttons[i].onclick = function (ev) {
          var t = ev.target || ev.srcElement;
          var idx = parseInt(t.getAttribute('data-p'), 10);
          selectPlayer(state.players[idx].name);
        };
      }
    }
    byId('back').onclick = showHome;
  }

  function selectPlayer(name) {
    state.lastPlayer = name;
    save();
    if (purpose === 'stats') showStats();
    else showLevels();
  }

  function submitName() {
    var name = cleanName(byId('name').value);
    var player;
    if (!name) {
      byId('err').textContent = L().needName;
      return;
    }
    player = findPlayer(name);
    if (!player) {
      player = { name: name, stats: blankStats(), current: null };
      state.players.push(player);
    }
    selectPlayer(name);
  }

  function showLevels() {
    var lang = L();
    var player = findPlayer(state.lastPlayer);
    var html = '';
    var i, info, st;
    view = 'levels';
    if (!player) {
      purpose = 'play';
      showPlayers();
      return;
    }
    html += '<h1>' + esc(player.name) + '</h1>';
    if (player.current) html += '<p class="meta">' + lang.replace + '</p>';
    for (i = 0; i < lang.levels.length; i++) {
      info = lang.levels[i];
      st = player.stats[info.id];
      html += '<button type="button" data-l="' + info.id + '">' + esc(info.name);
      html += '<span class="about">' + esc(info.about) + ' · ' + lang.completed + ' ' + (st ? st.completed : 0) + '</span>';
      html += '</button>';
    }
    html += '<button type="button" id="back">' + lang.back + '</button>';
    setApp(html);
    var buttons = document.getElementById('app').getElementsByTagName('button');
    for (i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-l')) {
        buttons[i].onclick = function (ev) {
          var t = ev.target || ev.srcElement;
          while (t && !t.getAttribute('data-l')) t = t.parentNode;
          startLevel(t.getAttribute('data-l'));
        };
      }
    }
    byId('back').onclick = showHome;
  }

  function contains(arr, value) {
    var i;
    for (i = 0; i < arr.length; i++) if (arr[i] === value) return true;
    return false;
  }

  function startLevel(id) {
    var player = findPlayer(state.lastPlayer);
    var list = PUZZLES[id];
    var seen, avail, i, index, item, values, givens, notes, solution, n;
    if (!player || !list || !list.length) return;
    seen = player.stats[id].seen;
    avail = [];
    for (i = 0; i < list.length; i++) {
      if (contains(seen, i)) continue;
      if (player.current && player.current.level === id && player.current.index === i) continue;
      avail.push(i);
    }
    if (!avail.length) {
      player.stats[id].seen = [];
      for (i = 0; i < list.length; i++) avail.push(i);
    }
    index = avail[(Math.random() * avail.length) | 0];
    item = list[index];
    values = [];
    givens = [];
    notes = [];
    solution = [];
    for (i = 0; i < 81; i++) {
      n = item.g.charCodeAt(i) - 48;
      values.push(n);
      givens.push(n ? 1 : 0);
      notes.push(0);
      solution.push(item.s.charCodeAt(i) - 48);
    }
    player.current = {
      level: id,
      index: index,
      values: values,
      givens: givens,
      notes: notes,
      solution: solution,
      mistakes: 0,
      hintsUsed: 0,
      elapsedMs: 0,
      undo: [],
      selected: -1,
      lastEdit: -1,
      notesMode: 0
    };
    sessionStart = 0;
    save();
    showGame();
  }

  function conflicts(i) {
    var g = cur();
    var v = g.values[i];
    var r, c, k, j, br, bc, rr, cc;
    if (!v) return false;
    r = (i / 9) | 0;
    c = i % 9;
    for (k = 0; k < 9; k++) {
      j = r * 9 + k;
      if (j !== i && g.values[j] === v) return true;
      j = k * 9 + c;
      if (j !== i && g.values[j] === v) return true;
    }
    br = ((r / 3) | 0) * 3;
    bc = ((c / 3) | 0) * 3;
    for (rr = 0; rr < 3; rr++) {
      for (cc = 0; cc < 3; cc++) {
        j = (br + rr) * 9 + (bc + cc);
        if (j !== i && g.values[j] === v) return true;
      }
    }
    return false;
  }

  function classFor(i) {
    var g = cur();
    var r = (i / 9) | 0;
    var c = i % 9;
    var cls = 'c';
    if (c === 0) cls += ' bl';
    if (r === 0) cls += ' bt';
    if (c === 2 || c === 5 || c === 8) cls += ' br';
    if (r === 2 || r === 5 || r === 8) cls += ' bb';
    if (g.givens[i]) cls += ' given';
    if (i === g.selected) cls += ' sel';
    if (state.checkConflicts && i === g.lastEdit && g.values[i] && conflicts(i)) cls += ' bad';
    return cls;
  }

  function notesHtml(mask) {
    var html = '<table class="n" style="font-size:' + notePx + 'px"><tbody>';
    var d = 1;
    var r, c;
    for (r = 0; r < 3; r++) {
      html += '<tr>';
      for (c = 0; c < 3; c++) {
        html += '<td>' + ((mask & (1 << d)) ? String(d) : '') + '</td>';
        d++;
      }
      html += '</tr>';
    }
    return html + '</tbody></table>';
  }

  function renderCell(i) {
    var g = cur();
    var td = boardCells[i];
    if (!td || !g) return;
    td.className = classFor(i);
    if (g.values[i]) td.innerHTML = String(g.values[i]);
    else if (g.notes[i]) td.innerHTML = notesHtml(g.notes[i]);
    else td.innerHTML = '';
  }

  function renderAll() {
    var i;
    for (i = 0; i < 81; i++) renderCell(i);
  }

  function viewportH() {
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function applySize(h) {
    var table = byId('board');
    var wrap = byId('boardwrap');
    var i, px;
    px = h * 9;
    if (wrap) wrap.style.width = (px + 2) + 'px';
    if (table) {
      table.style.width = px + 'px';
      table.style.height = px + 'px';
    }
    notePx = (h / 5) | 0;
    if (notePx < 7) notePx = 7;
    if (notePx > 16) notePx = 16;
    for (i = 0; i < boardCells.length; i++) {
      boardCells[i].style.height = h + 'px';
      boardCells[i].style.fontSize = ((h * 0.52) | 0) + 'px';
    }
    renderAll();
  }

  function sizeDigits() {
    var digits = byId('digits');
    var buttons, dw, i, fs;
    if (!digits) return 0;
    buttons = digits.getElementsByTagName('button');
    if (!buttons.length) return digits.offsetHeight;
    dw = buttons[0].offsetWidth;
    if (dw < 26) dw = 26;
    fs = (dw * 0.52) | 0;
    if (fs < 14) fs = 14;
    if (fs > 32) fs = 32;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].style.height = dw + 'px';
      buttons[i].style.fontSize = fs + 'px';
    }
    return digits.offsetHeight;
  }

  function sizeBoard() {
    var table = byId('board');
    var root = byId('playroot');
    var tools = byId('tools');
    var head = byId('ghead');
    var foot = byId('gfoot');
    var toolW, stageW, boardMax, cellW, vh, rootH, headH, footH, room, h, docH, extra, shrink;
    if (!table || !boardCells.length) return;
    vh = viewportH();
    rootH = vh - 8;
    if (rootH < 240) rootH = 240;
    if (root) root.style.height = rootH + 'px';
    toolW = 120;
    if (tools) {
      tools.style.width = toolW + 'px';
      if (tools.parentNode && tools.parentNode.style) tools.parentNode.style.width = toolW + 'px';
    }
    sizeDigits();
    stageW = root ? root.clientWidth : 0;
    if (!stageW) {
      renderAll();
      return;
    }
    boardMax = stageW - toolW - 8;
    if (boardMax < 180) boardMax = 180;
    cellW = (boardMax / 9) | 0;
    headH = head ? head.offsetHeight : 32;
    footH = foot ? foot.offsetHeight : 48;
    room = rootH - headH - footH - 4;
    if (room < 180) room = 180;
    h = (room / 9) | 0;
    if (cellW < h) h = cellW;
    if (h < 22) h = 22;
    applySize(h);
    docH = document.body.scrollHeight || document.documentElement.scrollHeight;
    if (vh && docH > vh + 2 && h > 22) {
      extra = docH - vh;
      shrink = ((extra / 9) | 0) + 1;
      h = h - shrink;
      if (h < 22) h = 22;
      applySize(h);
    }
    alignTools();
  }

  function alignTools() {
    var board = byId('board');
    var notes = byId('notes');
    var tools = byId('tools');
    var delta;
    if (!board || !notes || !tools || !board.getBoundingClientRect) return;
    tools.style.marginTop = '0px';
    delta = board.getBoundingClientRect().top - notes.getBoundingClientRect().top;
    delta = Math.round(delta);
    if (delta) tools.style.marginTop = delta + 'px';
  }

  function fold() {
    var g = cur();
    if (!g || !sessionStart) return;
    g.elapsedMs += Date.now() - sessionStart;
    sessionStart = Date.now();
  }

  function liveMs() {
    var g = cur();
    if (!g) return 0;
    if (!sessionStart) return g.elapsedMs;
    return g.elapsedMs + (Date.now() - sessionStart);
  }

  function updateHud() {
    var g = cur();
    var info, player;
    if (!g || !byId('time')) return;
    info = levelInfo(g.level);
    player = findPlayer(state.lastPlayer);
    if (byId('pname')) byId('pname').textContent = player ? player.name : '';
    if (byId('plevel')) byId('plevel').textContent = info ? info.name : '';
    byId('time').textContent = formatMs(liveMs());
    byId('miss').textContent = L().mistakes + ' ' + g.mistakes;
    byId('used').textContent = L().hints + ' ' + g.hintsUsed;
  }

  function paintNotes() {
    var g = cur();
    var b = byId('notes');
    if (!b || !g) return;
    b.className = g.notesMode ? 'on' : '';
    b.textContent = g.notesMode ? L().notesOn : L().notes;
  }

  function setHintBox(text) {
    var box = byId('hintbox');
    var had, next;
    if (!box) return;
    had = box.textContent ? 1 : 0;
    next = text ? 1 : 0;
    box.textContent = text || '';
    box.style.borderWidth = text ? '2px' : '0';
    if (view === 'game' && had !== next) sizeBoard();
  }

  function houseLabel(house, index) {
    var n = (index || 0) + 1;
    if (state.lang === 'en') {
      if (house === 'row') return 'row ' + n;
      if (house === 'col') return 'column ' + n;
      return 'box ' + n;
    }
    if (house === 'row') return n + '. satır';
    if (house === 'col') return n + '. sütun';
    return n + '. kutu';
  }

  function cellLabel(index) {
    var r = ((index / 9) | 0) + 1;
    var c = (index % 9) + 1;
    if (state.lang === 'en') return 'row ' + r + ', column ' + c;
    return r + '. satır, ' + c + '. sütun';
  }

  function hintText(hint) {
    var cell = cellLabel(hint.index);
    var d = String(hint.digit);
    var info = hint.info || {};
    var pd = String(info.digit || hint.digit);
    var digits = info.digits && info.digits.length ? info.digits.join(', ') : pd;
    var house = info.house ? houseLabel(info.house, info.houseIndex) : '';
    var tech = hint.tech;
    if (state.lang === 'en') {
      if (tech === 1 && house) return 'Hidden single: in ' + house + ', ' + d + ' fits only ' + cell + '.';
      if (tech === 2) return 'Naked single: ' + cell + ' has only ' + d + ' left.';
      if (tech === 3) return 'Pointing: ' + pd + ' is locked to one line in a box. Result: ' + cell + ' = ' + d + '.';
      if (tech === 4) return 'Box-line reduction: ' + pd + ' in a line sits in one box. Result: ' + cell + ' = ' + d + '.';
      if (tech === 5) return 'Naked pair (' + digits + ') locks two cells. Result: ' + cell + ' = ' + d + '.';
      if (tech === 6) return 'Hidden pair (' + digits + ') lives in only two cells. Result: ' + cell + ' = ' + d + '.';
      if (tech === 7) return 'Naked triple (' + digits + ') locks three cells. Result: ' + cell + ' = ' + d + '.';
      if (tech === 8) return 'Hidden triple (' + digits + ') lives in only three cells. Result: ' + cell + ' = ' + d + '.';
      if (tech === 9) return 'X-Wing: ' + pd + ' occupies the same two lines. Result: ' + cell + ' = ' + d + '.';
      if (tech === 10) return 'Swordfish: ' + pd + ' is locked across three lines. Result: ' + cell + ' = ' + d + '.';
      if (tech === 11) return 'XY-Wing: the wings remove ' + pd + '. Result: ' + cell + ' = ' + d + '.';
      if (tech === 12) return 'XYZ-Wing: the shared candidate ' + pd + ' is removed. Result: ' + cell + ' = ' + d + '.';
      return 'Next digit: ' + cell + ' = ' + d + '.';
    }
    if (tech === 1 && house) return 'Gizli tek: ' + house + ' içinde ' + d + ' yalnız ' + cell + ' hücresine yazılır.';
    if (tech === 2) return 'Çıplak tek: ' + cell + ' hücresinde geriye yalnız ' + d + ' kaldı.';
    if (tech === 3) return 'İşaretleme: ' + pd + ' bir kutuda tek çizgiye kilitli. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 4) return 'Satır-kutu elemesi: ' + pd + ' adayları tek kutuda toplanıyor. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 5) return 'Çıplak çift (' + digits + ') iki hücreyi kilitler. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 6) return 'Gizli çift (' + digits + ') yalnız iki hücrede duruyor. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 7) return 'Çıplak üçlü (' + digits + ') üç hücreyi kilitler. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 8) return 'Gizli üçlü (' + digits + ') yalnız üç hücrede. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 9) return 'X-Wing: ' + pd + ' iki çizgide aynı konuma oturur. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 10) return 'Swordfish: ' + pd + ' üç çizgide kilitlenir. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 11) return 'XY-Wing: kanatlar ' + pd + ' adayını eler. Sonuç: ' + cell + ' = ' + d + '.';
    if (tech === 12) return 'XYZ-Wing: ortak aday ' + pd + ' elenir. Sonuç: ' + cell + ' = ' + d + '.';
    return 'Sonraki rakam: ' + cell + ' = ' + d + '.';
  }

  function paintTouched(a, b, c, d) {
    var seen = {};
    var list = [a, b, c, d];
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] === null || list[i] === undefined || list[i] < 0 || seen[list[i]]) continue;
      seen[list[i]] = 1;
      renderCell(list[i]);
    }
  }

  function pushUndo(index) {
    var g = cur();
    g.undo.push({
      i: index,
      value: g.values[index],
      notes: g.notes[index],
      mistakes: g.mistakes,
      lastEdit: g.lastEdit,
      selected: g.selected
    });
    if (g.undo.length > 80) g.undo.shift();
  }

  function select(index) {
    var g = cur();
    var prev;
    if (!g || index < 0 || index > 80) return;
    prev = g.selected;
    g.selected = index;
    paintTouched(prev, index);
  }

  function placeDigit(d) {
    var g = cur();
    var prevLast, i;
    if (!g || g.selected < 0 || g.givens[g.selected]) return;
    if (d < 1 || d > 9) return;
    fold();
    i = g.selected;
    prevLast = g.lastEdit;
    pushUndo(i);
    if (g.notesMode && !g.values[i]) {
      g.notes[i] ^= (1 << d);
    } else {
      g.values[i] = d;
      g.notes[i] = 0;
      g.lastEdit = i;
      if (conflicts(i)) g.mistakes++;
    }
    setHintBox('');
    paintTouched(prevLast, i);
    updateHud();
    save();
    if (isWin()) finish();
  }

  function erase() {
    var g = cur();
    var i, prevLast;
    if (!g || g.selected < 0 || g.givens[g.selected]) return;
    i = g.selected;
    if (!g.values[i] && !g.notes[i]) return;
    fold();
    prevLast = g.lastEdit;
    pushUndo(i);
    g.values[i] = 0;
    g.notes[i] = 0;
    g.lastEdit = i;
    setHintBox('');
    paintTouched(prevLast, i);
    updateHud();
    save();
  }

  function undo() {
    var g = cur();
    var step, oldSel, oldLast;
    if (!g || !g.undo.length) return;
    fold();
    oldSel = g.selected;
    oldLast = g.lastEdit;
    step = g.undo.pop();
    g.values[step.i] = step.value;
    g.notes[step.i] = step.notes;
    g.mistakes = step.mistakes;
    g.lastEdit = step.lastEdit;
    g.selected = step.selected;
    setHintBox('');
    paintTouched(step.i, oldSel, oldLast, g.lastEdit);
    if (g.selected !== step.i && g.selected !== oldSel && g.selected !== oldLast && g.selected !== g.lastEdit) {
      renderCell(g.selected);
    }
    updateHud();
    save();
  }

  function useHint() {
    var g = cur();
    var grid = [];
    var i, hint, oldSel, oldLast;
    if (!g) return;
    for (i = 0; i < 81; i++) grid.push(g.values[i] === g.solution[i] ? g.solution[i] : 0);
    hint = SudokuTech.nextHint(grid);
    fold();
    if (!hint) {
      setHintBox(L().noHint);
      updateHud();
      return;
    }
    oldSel = g.selected;
    oldLast = g.lastEdit;
    pushUndo(hint.index);
    g.values[hint.index] = hint.digit;
    g.notes[hint.index] = 0;
    g.hintsUsed++;
    g.lastEdit = hint.index;
    g.selected = hint.index;
    setHintBox(hintText(hint));
    paintTouched(hint.index, oldSel, oldLast);
    updateHud();
    save();
    if (isWin()) finish();
  }

  function isWin() {
    var g = cur();
    var i;
    if (!g) return false;
    for (i = 0; i < 81; i++) if (g.values[i] !== g.solution[i]) return false;
    return true;
  }

  function finish() {
    var player = findPlayer(state.lastPlayer);
    var g = player.current;
    var st = player.stats[g.level];
    fold();
    st.completed += 1;
    st.mistakes += g.mistakes;
    st.hints += g.hintsUsed;
    if (!st.bestMs || g.elapsedMs < st.bestMs) st.bestMs = g.elapsedMs;
    if (!contains(st.seen, g.index)) st.seen.push(g.index);
    lastResult = { level: g.level, ms: g.elapsedMs, mistakes: g.mistakes, hints: g.hintsUsed };
    player.current = null;
    sessionStart = 0;
    save();
    showDone();
  }

  function onBoard(e) {
    var t = e.target || e.srcElement;
    var raw;
    while (t && t !== byId('board')) {
      if (t.getAttribute && t.getAttribute('data-i') !== null) {
        raw = t.getAttribute('data-i');
        select(parseInt(raw, 10));
        return;
      }
      t = t.parentNode;
    }
  }

  function showGame() {
    var g = cur();
    var lang, table, tbody, r, c, i, tr, td, html;
    if (!g) {
      showHome();
      return;
    }
    view = 'game';
    sessionStart = Date.now();
    lang = L();
    html = '<table class="playroot" id="playroot"><tbody>';
    html += '<tr><td id="ghead"><table class="head"><tbody><tr>';
    html += '<td class="hspacer"></td>';
    html += '<td class="htitle"><h1>' + lang.title + '</h1></td>';
    html += '<td class="hcredit">By Obilginozi</td>';
    html += '</tr></tbody></table></td></tr>';
    html += '<tr><td class="mid"><table class="stage"><tbody><tr>';
    html += '<td class="toolwrap"><table class="tools" id="tools"><tbody>';
    html += '<tr><td><button type="button" id="notes"></button></td></tr>';
    html += '<tr><td><button type="button" id="erase"></button></td></tr>';
    html += '<tr><td><button type="button" id="undo"></button></td></tr>';
    html += '<tr><td><button type="button" id="hint"></button></td></tr>';
    html += '<tr><td><button type="button" id="menu"></button></td></tr>';
    html += '<tr><td><button type="button" id="flashBtn"></button></td></tr>';
    html += '</tbody></table>';
    html += '<div class="sideinfo">';
    html += '<div class="infobox">';
    html += '<div id="pname" class="who"></div>';
    html += '<div id="plevel" class="lvl"></div>';
    html += '</div>';
    html += '<div class="infobox">';
    html += '<div id="time" class="stat"></div>';
    html += '<div id="miss" class="stat"></div>';
    html += '<div id="used" class="stat"></div>';
    html += '</div></div></td>';
    html += '<td id="boardwrap" class="boardwrap"><table id="board" class="board"></table></td>';
    html += '</tr></tbody></table></td></tr>';
    html += '<tr><td id="gfoot">';
    html += '<table class="digits" id="digits"><tbody><tr>';
    html += '<td><button type="button" data-d="1">1</button></td>';
    html += '<td><button type="button" data-d="2">2</button></td>';
    html += '<td><button type="button" data-d="3">3</button></td>';
    html += '<td><button type="button" data-d="4">4</button></td>';
    html += '<td><button type="button" data-d="5">5</button></td>';
    html += '<td><button type="button" data-d="6">6</button></td>';
    html += '<td><button type="button" data-d="7">7</button></td>';
    html += '<td><button type="button" data-d="8">8</button></td>';
    html += '<td><button type="button" data-d="9">9</button></td>';
    html += '</tr></tbody></table>';
    html += '<p id="hintbox" class="hintbox"></p>';
    html += '</td></tr></tbody></table>';
    setApp(html);
    byId('erase').textContent = lang.erase;
    byId('undo').textContent = lang.undo;
    byId('hint').textContent = lang.hint;
    byId('menu').textContent = lang.menu;
    byId('flashBtn').textContent = lang.refreshShort;
    table = byId('board');
    tbody = document.createElement('tbody');
    boardCells = [];
    i = 0;
    for (r = 0; r < 9; r++) {
      tr = document.createElement('tr');
      for (c = 0; c < 9; c++) {
        td = document.createElement('td');
        td.setAttribute('data-i', String(i));
        tr.appendChild(td);
        boardCells.push(td);
        i++;
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    table.onclick = onBoard;
    var padButtons = document.getElementById('app').getElementsByTagName('button');
    for (i = 0; i < padButtons.length; i++) {
      if (padButtons[i].getAttribute('data-d')) {
        padButtons[i].onclick = function (ev) {
          var t = ev.target || ev.srcElement;
          placeDigit(parseInt(t.getAttribute('data-d'), 10));
        };
      }
    }
    byId('notes').onclick = function () {
      var game = cur();
      if (!game) return;
      game.notesMode = game.notesMode ? 0 : 1;
      paintNotes();
      save();
    };
    byId('erase').onclick = erase;
    byId('undo').onclick = undo;
    byId('hint').onclick = useHint;
    byId('menu').onclick = function () {
      fold();
      sessionStart = 0;
      save();
      showHome();
    };
    byId('flashBtn').onclick = flash;
    paintNotes();
    updateHud();
    sizeBoard();
  }

  function showDone() {
    var lang = L();
    var info, html;
    view = 'done';
    info = lastResult ? levelInfo(lastResult.level) : null;
    html = '<h1>' + lang.done + '</h1>';
    if (info) html += '<p class="meta">' + esc(info.name) + '</p>';
    if (lastResult) {
      html += '<div class="block">';
      html += '<div>' + formatMs(lastResult.ms) + '</div>';
      html += '<div>' + lang.mistakes + ' ' + lastResult.mistakes + '</div>';
      html += '<div>' + lang.hints + ' ' + lastResult.hints + '</div>';
      html += '</div>';
    }
    html += '<button type="button" id="again">' + lang.again + '</button>';
    html += '<button type="button" id="home">' + lang.home + '</button>';
    setApp(html);
    byId('again').onclick = function () { purpose = 'play'; showPlayers(); };
    byId('home').onclick = showHome;
  }

  function showStats() {
    var lang = L();
    var player = findPlayer(state.lastPlayer);
    var html = '';
    var i, info, st;
    view = 'stats';
    if (!player) {
      purpose = 'stats';
      showPlayers();
      return;
    }
    html += '<h1>' + esc(player.name) + '</h1>';
    for (i = 0; i < lang.levels.length; i++) {
      info = lang.levels[i];
      st = player.stats[info.id];
      html += '<div class="block">';
      html += '<div class="bname">' + esc(info.name) + '</div>';
      html += '<div>' + lang.completed + ': ' + st.completed + '</div>';
      html += '<div>' + lang.best + ': ' + (st.bestMs ? formatMs(st.bestMs) : lang.none) + '</div>';
      html += '<div>' + lang.mistakes + ': ' + st.mistakes + '</div>';
      html += '<div>' + lang.hints + ': ' + st.hints + '</div>';
      html += '</div>';
    }
    html += '<button type="button" id="switch">' + lang.changePlayer + '</button>';
    html += '<button type="button" id="back">' + lang.back + '</button>';
    setApp(html);
    byId('switch').onclick = function () { purpose = 'stats'; showPlayers(); };
    byId('back').onclick = showHome;
  }

  function eat(e) {
    if (e.preventDefault) e.preventDefault();
  }

  function onKey(e) {
    var ch, code;
    if (view !== 'game') return;
    ch = e.key || '';
    if (ch.length === 1 && ch >= '1' && ch <= '9') {
      eat(e);
      placeDigit(parseInt(ch, 10));
      return;
    }
    if (ch === 'Backspace' || ch === 'Delete') { eat(e); erase(); return; }
    if (ch === 'ArrowLeft') { eat(e); moveSel(0, -1); return; }
    if (ch === 'ArrowRight') { eat(e); moveSel(0, 1); return; }
    if (ch === 'ArrowUp') { eat(e); moveSel(-1, 0); return; }
    if (ch === 'ArrowDown') { eat(e); moveSel(1, 0); return; }
    if ((ch === 'z' || ch === 'Z') && (e.ctrlKey || e.metaKey)) { eat(e); undo(); return; }
    code = e.keyCode || e.which || 0;
    if (!ch) {
      if (code >= 49 && code <= 57) { eat(e); placeDigit(code - 48); return; }
      if (code >= 97 && code <= 105) { eat(e); placeDigit(code - 96); return; }
      if (code === 8 || code === 46) { eat(e); erase(); return; }
      if (code === 37) { eat(e); moveSel(0, -1); return; }
      if (code === 39) { eat(e); moveSel(0, 1); return; }
      if (code === 38) { eat(e); moveSel(-1, 0); return; }
      if (code === 40) { eat(e); moveSel(1, 0); return; }
    }
  }

  function moveSel(dr, dc) {
    var g = cur();
    var i, r, c;
    if (!g) return;
    i = g.selected < 0 ? 0 : g.selected;
    r = (i / 9) | 0;
    c = i % 9;
    if (g.selected < 0 && (dr || dc)) {
      select(0);
      return;
    }
    r += dr;
    c += dc;
    if (r < 0) r = 0;
    if (r > 8) r = 8;
    if (c < 0) c = 0;
    if (c > 8) c = 8;
    select(r * 9 + c);
  }

  function prepareOffline() {
    if (offlineBound) return;
    offlineBound = true;
    if (!navigator.serviceWorker) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    try {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        var node = byId('offline');
        if (node) node.textContent = offlineText();
      });
    } catch (e4) {}
    navigator.serviceWorker.register('sw.js')['catch'](function () {});
  }

  function main() {
    load();
    document.onkeydown = onKey;
    prepareOffline();
    if (!state.lang) showLang();
    else showHome();
  }

  main();
})();
