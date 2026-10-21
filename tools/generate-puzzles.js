/* Build a bank of unique puzzles and write index.html.
   Node only. The Kindle file does not run this. */
var fs = require('fs');
var path = require('path');
var os = require('os');
var childProcess = require('child_process');
var SudokuTech = require('./techniques');

var TARGET = 40;
var LEVELS = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
var MIN_EMPTY = { beginner: 32, easy: 46, medium: 46, hard: 36, expert: 48, master: 48 };
var TARGET_EMPTY = { beginner: 40, easy: 54, medium: 54, hard: 54, expert: 55, master: 56 };
var ALL = 1022;

function bandFor(tech) {
  if (tech >= 1 && tech <= 2) return 'beginner';
  if (tech >= 3 && tech <= 4) return 'easy';
  if (tech >= 5 && tech <= 6) return 'medium';
  if (tech >= 7 && tech <= 9) return 'hard';
  if (tech >= 10 && tech <= 11) return 'expert';
  if (tech === 12) return 'master';
  return null;
}

function emptyCount(grid) {
  var n = 0;
  var i;
  for (i = 0; i < 81; i++) if (!grid[i]) n++;
  return n;
}

function toStr(grid) {
  var s = '';
  var i;
  for (i = 0; i < 81; i++) s += grid[i] ? String(grid[i]) : '0';
  return s;
}

function fromStr(s) {
  var g = [];
  var i;
  for (i = 0; i < 81; i++) g.push(s.charCodeAt(i) - 48);
  return g;
}

function shuffle(a) {
  var i, j, t;
  for (i = a.length - 1; i > 0; i--) {
    j = (Math.random() * (i + 1)) | 0;
    t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function countSolutions(clues, limit) {
  var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var cols = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var boxes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var empty = [];
  var i, d, r, c, b, bit, count, nEmpty;
  for (i = 0; i < 81; i++) {
    d = clues[i] | 0;
    r = (i / 9) | 0;
    c = i % 9;
    b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
    if (d) {
      bit = 1 << d;
      if ((rows[r] | cols[c] | boxes[b]) & bit) return 0;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
    } else {
      empty.push(i);
    }
  }
  count = 0;
  nEmpty = empty.length;
  function bt(pos) {
    var best, bestN, bestMask, bestR, bestC, bestB, k, mask, n, m, tmp, bit2;
    if (count >= limit) return;
    if (pos === nEmpty) {
      count++;
      return;
    }
    best = pos;
    bestN = 10;
    bestMask = 0;
    bestR = 0;
    bestC = 0;
    bestB = 0;
    for (k = pos; k < nEmpty; k++) {
      i = empty[k];
      r = (i / 9) | 0;
      c = i % 9;
      b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      mask = ALL & ~(rows[r] | cols[c] | boxes[b]);
      n = 0;
      m = mask;
      while (m) {
        m &= m - 1;
        n++;
      }
      if (n === 0) return;
      if (n < bestN) {
        bestN = n;
        best = k;
        bestMask = mask;
        bestR = r;
        bestC = c;
        bestB = b;
        if (n === 1) break;
      }
    }
    tmp = empty[pos];
    empty[pos] = empty[best];
    empty[best] = tmp;
    mask = bestMask;
    while (mask && count < limit) {
      bit2 = mask & -mask;
      rows[bestR] |= bit2;
      cols[bestC] |= bit2;
      boxes[bestB] |= bit2;
      bt(pos + 1);
      rows[bestR] ^= bit2;
      cols[bestC] ^= bit2;
      boxes[bestB] ^= bit2;
      mask ^= bit2;
    }
  }
  bt(0);
  return count;
}

function fillGrid() {
  var grid = [];
  var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var cols = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var boxes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var i;
  for (i = 0; i < 81; i++) grid.push(0);
  function bt(pos) {
    var r, c, b, mask, digits, d, bit, k, j, t;
    if (pos === 81) return true;
    r = (pos / 9) | 0;
    c = pos % 9;
    b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
    mask = ALL & ~(rows[r] | cols[c] | boxes[b]);
    digits = [];
    for (d = 1; d <= 9; d++) if (mask & (1 << d)) digits.push(d);
    for (k = digits.length - 1; k > 0; k--) {
      j = (Math.random() * (k + 1)) | 0;
      t = digits[k];
      digits[k] = digits[j];
      digits[j] = t;
    }
    for (k = 0; k < digits.length; k++) {
      d = digits[k];
      bit = 1 << d;
      grid[pos] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (bt(pos + 1)) return true;
      rows[r] ^= bit;
      cols[c] ^= bit;
      boxes[b] ^= bit;
      grid[pos] = 0;
    }
    return false;
  }
  if (!bt(0)) return null;
  return grid;
}

function symmetricPairs() {
  var pairs = [];
  var i;
  for (i = 0; i < 40; i++) pairs.push([i, 80 - i]);
  pairs.push([40]);
  return pairs;
}

function clueScore(band, empty) {
  var d = empty - TARGET_EMPTY[band];
  if (d < 0) d = -d;
  return d;
}

function remember(best, puzzle, solution, tech) {
  var band = bandFor(tech);
  var empty, score;
  if (!band) return;
  empty = emptyCount(puzzle);
  if (empty < MIN_EMPTY[band]) return;
  score = clueScore(band, empty);
  if (!best[band] || score < best[band].score) {
    best[band] = { band: band, g: toStr(puzzle), s: toStr(solution), tech: tech, score: score };
  }
}

/* Drop a set of cells if the puzzle stays unique and solvable. */
function tryRemove(puzzle, solution, cells, best, ceiling) {
  var backup = [];
  var i, tech;
  for (i = 0; i < cells.length; i++) {
    backup.push(puzzle[cells[i]]);
    puzzle[cells[i]] = 0;
  }
  if (countSolutions(puzzle, 2) !== 1) {
    for (i = 0; i < cells.length; i++) puzzle[cells[i]] = backup[i];
    return 'unique';
  }
  tech = SudokuTech.rate(puzzle, solution);
  if (tech < 0 || (ceiling && tech > ceiling)) {
    for (i = 0; i < cells.length; i++) puzzle[cells[i]] = backup[i];
    return 'rate';
  }
  remember(best, puzzle, solution, tech);
  return 'ok';
}

function digFrom(solution, ceiling) {
  var puzzle = solution.slice();
  var best = {};
  var pairs = shuffle(symmetricPairs());
  var order = [];
  var p, i, result;
  for (p = 0; p < pairs.length; p++) {
    result = tryRemove(puzzle, solution, pairs[p], best, ceiling);
    if (result !== 'ok' && pairs[p].length === 2) {
      tryRemove(puzzle, solution, [pairs[p][0]], best, ceiling);
      tryRemove(puzzle, solution, [pairs[p][1]], best, ceiling);
    }
  }
  for (i = 0; i < 81; i++) order.push(i);
  shuffle(order);
  for (i = 0; i < order.length; i++) {
    if (puzzle[order[i]] === 0) continue;
    tryRemove(puzzle, solution, [order[i]], best, ceiling);
  }
  return best;
}

/* Two digs of the same grid: one capped at triples/X-Wing, one open through XYZ-Wing. */
function digGrid() {
  var solution = fillGrid();
  var capped, open, i, band, out;
  if (!solution) return [];
  capped = digFrom(solution, 9);
  open = digFrom(solution, 0);
  out = [];
  for (i = 0; i < LEVELS.length; i++) {
    band = LEVELS[i];
    if (band === 'hard' && capped[band]) out.push(capped[band]);
    else if (open[band]) out.push(open[band]);
    else if (capped[band]) out.push(capped[band]);
  }
  return out;
}

function solvedByHints(puzzle, solution) {
  var grid = puzzle.slice();
  var guard = 0;
  var hint, i, done;
  while (guard++ < 90) {
    done = true;
    for (i = 0; i < 81; i++) if (grid[i] !== solution[i]) done = false;
    if (done) return true;
    hint = SudokuTech.nextHint(grid);
    if (!hint) return false;
    if (hint.digit !== solution[hint.index]) return false;
    grid[hint.index] = hint.digit;
  }
  return false;
}

function selfTest() {
  var famous = '003020600900305001001806400008102900700000008006708200002609500800203009005010300';
  var grid = fromStr(famous);
  var n = countSolutions(grid, 2);
  var solution, hole, tech, chain, bad;
  if (n !== 1) throw new Error('famous puzzle solution count ' + n);
  tech = SudokuTech.rate(grid);
  if (tech < 1) throw new Error('famous puzzle unrated ' + tech);
  solution = fillGrid();
  if (!solution) throw new Error('fill failed');
  if (countSolutions(solution, 2) !== 1) throw new Error('full grid not unique');
  hole = solution.slice();
  hole[0] = 0;
  if (SudokuTech.rate(hole, solution) !== 1) throw new Error('single hole should be a hidden single');
  if (!solvedByHints(hole, solution)) throw new Error('hint chain failed on one hole');
  bad = solution.slice();
  bad[1] = bad[0];
  if (countSolutions(bad, 2) !== 0) throw new Error('duplicate row should have 0 solutions');
  if (SudokuTech.rate(bad) !== -1) throw new Error('contradiction should not rate');
  if (!solvedByHints(grid, (function () {
    var g = grid.slice();
    var guard = 0;
    var hint;
    while (guard++ < 90) {
      hint = SudokuTech.nextHint(g);
      if (!hint) break;
      g[hint.index] = hint.digit;
    }
    return g;
  })())) throw new Error('famous hint chain failed');
  console.log('self-test ok, famous rating', tech);
}

function validSolution(grid) {
  var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var cols = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var boxes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var i, d, bit, r, c, b;
  for (i = 0; i < 81; i++) {
    d = grid[i];
    if (d < 1 || d > 9) return false;
    bit = 1 << d;
    r = (i / 9) | 0;
    c = i % 9;
    b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
    if ((rows[r] | cols[c] | boxes[b]) & bit) return false;
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }
  return true;
}

function acceptPuzzle(item) {
  var puzzle = fromStr(item.g);
  var solution = fromStr(item.s);
  var i, tech;
  if (item.g.length !== 81 || item.s.length !== 81) return false;
  if (!validSolution(solution)) return false;
  for (i = 0; i < 81; i++) {
    if (puzzle[i] && puzzle[i] !== solution[i]) return false;
  }
  if (countSolutions(puzzle, 2) !== 1) return false;
  tech = SudokuTech.rate(puzzle, solution);
  if (bandFor(tech) !== item.band) return false;
  if (!solvedByHints(puzzle, solution)) return false;
  return true;
}

function emptyBank() {
  var bank = {};
  var i;
  for (i = 0; i < LEVELS.length; i++) bank[LEVELS[i]] = [];
  return bank;
}

function bankFull(bank) {
  var i;
  for (i = 0; i < LEVELS.length; i++) {
    if (bank[LEVELS[i]].length < TARGET) return false;
  }
  return true;
}

function bankLine(bank) {
  var parts = [];
  var i;
  for (i = 0; i < LEVELS.length; i++) {
    parts.push(LEVELS[i] + ' ' + bank[LEVELS[i]].length + '/' + TARGET);
  }
  return parts.join('  ');
}

function buildHtml(bank) {
  var shell = fs.readFileSync(path.join(__dirname, 'shell.html'), 'utf8');
  var tech = fs.readFileSync(path.join(__dirname, 'techniques.js'), 'utf8');
  var app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  var payload = {};
  var i, j, list, item;
  for (i = 0; i < LEVELS.length; i++) {
    list = [];
    for (j = 0; j < bank[LEVELS[i]].length; j++) {
      item = bank[LEVELS[i]][j];
      list.push({ g: item.g, s: item.s });
    }
    payload[LEVELS[i]] = list;
  }
  var json = JSON.stringify(payload).replace(/</g, '\\u003c');
  var code = tech + '\nvar PUZZLES = ' + json + ';\n' + app;
  var html = shell.replace('__CODE__', code);
  var out = path.join(__dirname, '..', 'index.html');
  fs.writeFileSync(out, html);
  console.log('wrote', out, 'bytes', html.length);
}

function loadBank(file) {
  var bank = emptyBank();
  var raw, data, i, j;
  if (!fs.existsSync(file)) return bank;
  raw = fs.readFileSync(file, 'utf8');
  data = JSON.parse(raw);
  for (i = 0; i < LEVELS.length; i++) {
    if (!data[LEVELS[i]]) continue;
    for (j = 0; j < data[LEVELS[i]].length && bank[LEVELS[i]].length < TARGET; j++) {
      bank[LEVELS[i]].push(data[LEVELS[i]][j]);
    }
  }
  return bank;
}

function saveBank(file, bank) {
  var slim = {};
  var i, j, list;
  for (i = 0; i < LEVELS.length; i++) {
    list = [];
    for (j = 0; j < bank[LEVELS[i]].length; j++) {
      list.push({
        g: bank[LEVELS[i]][j].g,
        s: bank[LEVELS[i]][j].s,
        tech: bank[LEVELS[i]][j].tech,
        band: LEVELS[i]
      });
    }
    slim[LEVELS[i]] = list;
  }
  fs.writeFileSync(file, JSON.stringify(slim));
}

function seenMap(bank) {
  var seen = {};
  var i, j;
  for (i = 0; i < LEVELS.length; i++) {
    for (j = 0; j < bank[LEVELS[i]].length; j++) seen[bank[LEVELS[i]][j].g] = 1;
  }
  return seen;
}

function addFound(bank, seen, found) {
  var i, item, band;
  var added = 0;
  for (i = 0; i < found.length; i++) {
    item = found[i];
    band = item.band;
    if (!band || !bank[band]) continue;
    if (bank[band].length >= TARGET) continue;
    if (seen[item.g]) continue;
    if (!acceptPuzzle(item)) {
      console.log('rejected', band, 'tech', item.tech);
      continue;
    }
    seen[item.g] = 1;
    bank[band].push({ g: item.g, s: item.s, tech: item.tech, band: band });
    added++;
  }
  return added;
}

function generate(bankFile) {
  var bank = loadBank(bankFile);
  var seen = seenMap(bank);
  var workers = Math.max(2, Math.min(8, os.cpus().length));
  var kids = [];
  var grids = 0;
  var stopped = false;
  var lastSave = Date.now();
  console.log(bankLine(bank));
  if (bankFull(bank)) return bank;

  function shutdown() {
    var i;
    if (stopped) return;
    stopped = true;
    for (i = 0; i < kids.length; i++) {
      try { kids[i].send('stop'); } catch (e) { /* already gone */ }
      try { kids[i].kill(); } catch (e2) { /* already gone */ }
    }
  }

  return new Promise(function (resolve, reject) {
    var i, kid, pending;
    function maybeDone() {
      if (!bankFull(bank)) return;
      saveBank(bankFile, bank);
      shutdown();
      resolve(bank);
    }
    for (i = 0; i < workers; i++) {
      kid = childProcess.fork(__filename, [], {
        env: Object.assign({}, process.env, { SUDOKU_WORKER: '1' }),
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      });
      kids.push(kid);
      kid.on('message', function (msg) {
        var n;
        if (stopped) return;
        if (!msg || !msg.found) return;
        grids++;
        n = addFound(bank, seen, msg.found);
        if (n || grids % 20 === 0) console.log('grids', grids, bankLine(bank));
        if (grids > 40000 && !bankFull(bank)) {
          saveBank(bankFile, bank);
          shutdown();
          reject(new Error('incomplete ' + bankLine(bank)));
          return;
        }
        if (Date.now() - lastSave > 4000) {
          saveBank(bankFile, bank);
          lastSave = Date.now();
        }
        maybeDone();
      });
      kid.on('exit', function (code) {
        if (stopped) return;
        if (code && code !== 0) {
          shutdown();
          reject(new Error('worker exit ' + code));
        }
      });
    }
    pending = null;
  });
}

function workerMain() {
  var running = true;
  process.on('message', function (msg) {
    if (msg === 'stop') {
      running = false;
      process.exit(0);
    }
  });
  function step() {
    var found;
    if (!running) return;
    try {
      found = digGrid();
    } catch (err) {
      console.error(err);
      process.exit(1);
      return;
    }
    if (!running) return;
    try {
      process.send({ found: found });
    } catch (err2) {
      process.exit(0);
      return;
    }
    setImmediate(step);
  }
  setImmediate(step);
}

function rebuildOnly(bankFile) {
  var bank = loadBank(bankFile);
  if (!bankFull(bank)) {
    console.log('bank is short:', bankLine(bank));
    process.exit(1);
  }
  buildHtml(bank);
}

module.exports = { digGrid: digGrid, bandFor: bandFor, countSolutions: countSolutions, fromStr: fromStr };

if (process.env.SUDOKU_WORKER === '1') {
  workerMain();
} else if (require.main === module) {
  var bankFile = path.join(__dirname, 'puzzles.json');
  var argv = process.argv.slice(2);
  selfTest();
  if (argv.indexOf('--test') !== -1) {
    process.exit(0);
  }
  if (argv.indexOf('--build') !== -1) {
    rebuildOnly(bankFile);
  } else {
    generate(bankFile).then(function (bank) {
      console.log('complete', bankLine(bank));
      buildHtml(bank);
    }).catch(function (err) {
      console.error(err);
      process.exit(1);
    });
  }
}
