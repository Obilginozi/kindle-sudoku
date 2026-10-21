/* Human Sudoku techniques, easiest first. ES5, no library.
   Ratings match the game bands:
   1 hidden single, 2 naked single,
   3 pointing, 4 claiming,
   5 naked pair, 6 hidden pair,
   7 naked triple, 8 hidden triple, 9 x-wing,
   10 swordfish, 11 xy-wing, 12 xyz-wing. */
var SudokuTech = (function () {
  'use strict';

  var ALL = 1022;
  var ROWS = [];
  var COLS = [];
  var BOXES = [];
  var UNITS = [];
  var PEERS = [];
  var SEE = [];

  function boxOf(i) {
    return (((i / 9) | 0) / 3 | 0) * 3 + (((i % 9) / 3) | 0);
  }

  function popcount(n) {
    var c = 0;
    while (n) {
      n &= n - 1;
      c++;
    }
    return c;
  }

  function digitOfMask(mask) {
    var d = 0;
    while (mask > 1) {
      mask >>= 1;
      d++;
    }
    return d;
  }

  function maskDigits(mask) {
    var ds = [];
    var d;
    for (d = 1; d <= 9; d++) {
      if (mask & (1 << d)) ds.push(d);
    }
    return ds;
  }

  function combinations(arr, k) {
    var out = [];
    var n = arr.length;
    function rec(start, combo) {
      var i;
      if (combo.length === k) {
        out.push(combo.slice());
        return;
      }
      for (i = start; i < n; i++) {
        combo.push(arr[i]);
        rec(i + 1, combo);
        combo.pop();
      }
    }
    rec(0, []);
    return out;
  }

  function unitMeta(u) {
    if (u < 9) return { house: 'row', houseIndex: u };
    if (u < 18) return { house: 'col', houseIndex: u - 9 };
    return { house: 'box', houseIndex: u - 18 };
  }

  (function buildMaps() {
    var r, c, b, i, j, k, list, seen, unit;
    for (r = 0; r < 9; r++) {
      list = [];
      for (c = 0; c < 9; c++) list.push(r * 9 + c);
      ROWS.push(list);
      UNITS.push(list);
    }
    for (c = 0; c < 9; c++) {
      list = [];
      for (r = 0; r < 9; r++) list.push(r * 9 + c);
      COLS.push(list);
      UNITS.push(list);
    }
    for (b = 0; b < 9; b++) {
      list = [];
      var br = ((b / 3) | 0) * 3;
      var bc = (b % 3) * 3;
      for (r = 0; r < 3; r++) {
        for (c = 0; c < 3; c++) list.push((br + r) * 9 + (bc + c));
      }
      BOXES.push(list);
      UNITS.push(list);
    }
    for (i = 0; i < 81; i++) {
      seen = {};
      list = [];
      unit = ROWS[(i / 9) | 0];
      for (k = 0; k < 9; k++) {
        j = unit[k];
        if (j !== i && !seen[j]) { seen[j] = 1; list.push(j); }
      }
      unit = COLS[i % 9];
      for (k = 0; k < 9; k++) {
        j = unit[k];
        if (j !== i && !seen[j]) { seen[j] = 1; list.push(j); }
      }
      unit = BOXES[boxOf(i)];
      for (k = 0; k < 9; k++) {
        j = unit[k];
        if (j !== i && !seen[j]) { seen[j] = 1; list.push(j); }
      }
      PEERS.push(list);
      SEE.push([]);
    }
    for (i = 0; i < 81; i++) {
      for (j = 0; j < 81; j++) SEE[i][j] = 0;
      list = PEERS[i];
      for (k = 0; k < list.length; k++) SEE[i][list[k]] = 1;
    }
  })();

  function initState(src) {
    var grid = [];
    var cands = [];
    var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var cols = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var boxes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var i, d, bit, r, c, b;
    for (i = 0; i < 81; i++) {
      d = src[i] | 0;
      if (d < 0 || d > 9) return null;
      grid.push(d);
      r = (i / 9) | 0;
      c = i % 9;
      b = boxOf(i);
      if (d) {
        bit = 1 << d;
        if ((rows[r] | cols[c] | boxes[b]) & bit) return null;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
      }
    }
    for (i = 0; i < 81; i++) {
      if (grid[i]) {
        cands.push(0);
      } else {
        r = (i / 9) | 0;
        c = i % 9;
        b = boxOf(i);
        cands.push(ALL & ~(rows[r] | cols[c] | boxes[b]));
        if (!cands[i]) return null;
      }
    }
    return { grid: grid, cands: cands };
  }

  function isSolved(grid) {
    var i;
    for (i = 0; i < 81; i++) if (!grid[i]) return false;
    return true;
  }

  function place(state, index, digit) {
    var bit = 1 << digit;
    var list = PEERS[index];
    var k, j;
    state.grid[index] = digit;
    state.cands[index] = 0;
    for (k = 0; k < list.length; k++) {
      j = list[k];
      if (state.grid[j]) continue;
      state.cands[j] &= ~bit;
      if (!state.cands[j]) return false;
    }
    return true;
  }

  function applyElim(state, elim) {
    var k, bit, i, changed;
    changed = false;
    for (k = 0; k < elim.length; k++) {
      i = elim[k].index;
      if (state.grid[i]) continue;
      bit = 1 << elim[k].digit;
      if (state.cands[i] & bit) {
        state.cands[i] &= ~bit;
        changed = true;
        if (!state.cands[i]) return false;
      }
    }
    return changed;
  }

  function findHiddenSingle(state) {
    var u, k, d, bit, count, found, unit, meta, i;
    for (u = 0; u < 27; u++) {
      unit = UNITS[u];
      for (d = 1; d <= 9; d++) {
        bit = 1 << d;
        count = 0;
        found = -1;
        for (k = 0; k < 9; k++) {
          i = unit[k];
          if (state.grid[i] === d) { count = 0; break; }
          if (!state.grid[i] && (state.cands[i] & bit)) {
            count++;
            found = i;
            if (count > 1) break;
          }
        }
        if (count === 1) {
          meta = unitMeta(u);
          return {
            tech: 1,
            place: { index: found, digit: d },
            digit: d,
            house: meta.house,
            houseIndex: meta.houseIndex
          };
        }
      }
    }
    return null;
  }

  function findNakedSingle(state) {
    var i, m, d;
    for (i = 0; i < 81; i++) {
      if (state.grid[i]) continue;
      m = state.cands[i];
      if (m && (m & (m - 1)) === 0) {
        d = digitOfMask(m);
        return { tech: 2, place: { index: i, digit: d }, digit: d, index: i };
      }
    }
    return null;
  }

  function findPointing(state) {
    var b, d, bit, k, i, n, rowBits, colBits, elim, row, col, c, r;
    for (b = 0; b < 9; b++) {
      for (d = 1; d <= 9; d++) {
        bit = 1 << d;
        n = 0;
        rowBits = 0;
        colBits = 0;
        for (k = 0; k < 9; k++) {
          i = BOXES[b][k];
          if (!state.grid[i] && (state.cands[i] & bit)) {
            n++;
            rowBits |= 1 << ((i / 9) | 0);
            colBits |= 1 << (i % 9);
          }
        }
        if (n < 2) continue;
        elim = [];
        if ((rowBits & (rowBits - 1)) === 0) {
          row = digitOfMask(rowBits);
          for (c = 0; c < 9; c++) {
            i = row * 9 + c;
            if (boxOf(i) !== b && !state.grid[i] && (state.cands[i] & bit)) {
              elim.push({ index: i, digit: d });
            }
          }
        } else if ((colBits & (colBits - 1)) === 0) {
          col = digitOfMask(colBits);
          for (r = 0; r < 9; r++) {
            i = r * 9 + col;
            if (boxOf(i) !== b && !state.grid[i] && (state.cands[i] & bit)) {
              elim.push({ index: i, digit: d });
            }
          }
        }
        if (elim.length) {
          return { tech: 3, elim: elim, digit: d, house: 'box', houseIndex: b };
        }
      }
    }
    return null;
  }

  function findClaiming(state) {
    var r, c, d, bit, n, boxBits, b, elim, k, i, line;
    for (r = 0; r < 9; r++) {
      for (d = 1; d <= 9; d++) {
        bit = 1 << d;
        n = 0;
        boxBits = 0;
        for (c = 0; c < 9; c++) {
          i = r * 9 + c;
          if (!state.grid[i] && (state.cands[i] & bit)) {
            n++;
            boxBits |= 1 << boxOf(i);
          }
        }
        if (n >= 2 && (boxBits & (boxBits - 1)) === 0) {
          b = digitOfMask(boxBits);
          elim = [];
          for (k = 0; k < 9; k++) {
            i = BOXES[b][k];
            if (((i / 9) | 0) !== r && !state.grid[i] && (state.cands[i] & bit)) {
              elim.push({ index: i, digit: d });
            }
          }
          if (elim.length) {
            return { tech: 4, elim: elim, digit: d, house: 'row', houseIndex: r };
          }
        }
      }
    }
    for (c = 0; c < 9; c++) {
      for (d = 1; d <= 9; d++) {
        bit = 1 << d;
        n = 0;
        boxBits = 0;
        for (r = 0; r < 9; r++) {
          i = r * 9 + c;
          if (!state.grid[i] && (state.cands[i] & bit)) {
            n++;
            boxBits |= 1 << boxOf(i);
          }
        }
        if (n >= 2 && (boxBits & (boxBits - 1)) === 0) {
          b = digitOfMask(boxBits);
          elim = [];
          for (k = 0; k < 9; k++) {
            i = BOXES[b][k];
            if ((i % 9) !== c && !state.grid[i] && (state.cands[i] & bit)) {
              elim.push({ index: i, digit: d });
            }
          }
          if (elim.length) {
            return { tech: 4, elim: elim, digit: d, house: 'col', houseIndex: c };
          }
        }
      }
    }
    line = null;
    return line;
  }

  function findNakedSubset(state, size, tech) {
    var u, k, i, pc, idxs, combos, ci, combo, union, elim, j, inCombo, bits, d, meta;
    for (u = 0; u < 27; u++) {
      idxs = [];
      for (k = 0; k < 9; k++) {
        i = UNITS[u][k];
        if (state.grid[i]) continue;
        pc = popcount(state.cands[i]);
        if (pc >= 2 && pc <= size) idxs.push(i);
      }
      if (idxs.length < size) continue;
      combos = combinations(idxs, size);
      for (ci = 0; ci < combos.length; ci++) {
        combo = combos[ci];
        union = 0;
        for (j = 0; j < combo.length; j++) union |= state.cands[combo[j]];
        if (popcount(union) !== size) continue;
        elim = [];
        for (k = 0; k < 9; k++) {
          i = UNITS[u][k];
          if (state.grid[i]) continue;
          inCombo = false;
          for (j = 0; j < combo.length; j++) if (combo[j] === i) inCombo = true;
          if (inCombo) continue;
          bits = state.cands[i] & union;
          if (!bits) continue;
          for (d = 1; d <= 9; d++) {
            if (bits & (1 << d)) elim.push({ index: i, digit: d });
          }
        }
        if (elim.length) {
          meta = unitMeta(u);
          return {
            tech: tech,
            elim: elim,
            digits: maskDigits(union),
            house: meta.house,
            houseIndex: meta.houseIndex
          };
        }
      }
    }
    return null;
  }

  function findHiddenSubset(state, size, tech) {
    var u, d, k, i, digitList, combos, ci, combo, positions, seen, p, elim, bits, dd, meta, cell;
    for (u = 0; u < 27; u++) {
      digitList = [];
      var where = [];
      for (d = 1; d <= 9; d++) {
        positions = [];
        for (k = 0; k < 9; k++) {
          i = UNITS[u][k];
          if (!state.grid[i] && (state.cands[i] & (1 << d))) positions.push(i);
        }
        where[d] = positions;
        if (positions.length >= 1 && positions.length <= size) digitList.push(d);
      }
      if (digitList.length < size) continue;
      combos = combinations(digitList, size);
      for (ci = 0; ci < combos.length; ci++) {
        combo = combos[ci];
        seen = {};
        positions = [];
        for (p = 0; p < combo.length; p++) {
          var cells = where[combo[p]];
          for (k = 0; k < cells.length; k++) {
            cell = cells[k];
            if (!seen[cell]) {
              seen[cell] = 1;
              positions.push(cell);
              if (positions.length > size) break;
            }
          }
          if (positions.length > size) break;
        }
        if (positions.length !== size) continue;
        elim = [];
        bits = 0;
        for (p = 0; p < combo.length; p++) bits |= 1 << combo[p];
        for (k = 0; k < positions.length; k++) {
          i = positions[k];
          for (dd = 1; dd <= 9; dd++) {
            if ((state.cands[i] & (1 << dd)) && !(bits & (1 << dd))) {
              elim.push({ index: i, digit: dd });
            }
          }
        }
        if (elim.length) {
          meta = unitMeta(u);
          return {
            tech: tech,
            elim: elim,
            digits: combo.slice(),
            house: meta.house,
            houseIndex: meta.houseIndex
          };
        }
      }
    }
    return null;
  }

  function findFish(state, size, tech) {
    var d, bit, r, c, i, cols, rows, bases, combos, ci, combo, unionMap, union, e, elim, rr, cc, inBase;
    for (d = 1; d <= 9; d++) {
      bit = 1 << d;
      bases = [];
      for (r = 0; r < 9; r++) {
        cols = [];
        for (c = 0; c < 9; c++) {
          i = r * 9 + c;
          if (!state.grid[i] && (state.cands[i] & bit)) cols.push(c);
        }
        if (cols.length >= 2 && cols.length <= size) bases.push({ line: r, cover: cols });
      }
      if (bases.length >= size) {
        combos = combinations(bases, size);
        for (ci = 0; ci < combos.length; ci++) {
          combo = combos[ci];
          unionMap = {};
          union = [];
          for (e = 0; e < combo.length; e++) {
            for (c = 0; c < combo[e].cover.length; c++) {
              cc = combo[e].cover[c];
              if (!unionMap[cc]) { unionMap[cc] = 1; union.push(cc); }
            }
          }
          if (union.length !== size) continue;
          elim = [];
          for (rr = 0; rr < 9; rr++) {
            inBase = false;
            for (e = 0; e < combo.length; e++) if (combo[e].line === rr) inBase = true;
            if (inBase) continue;
            for (c = 0; c < union.length; c++) {
              i = rr * 9 + union[c];
              if (!state.grid[i] && (state.cands[i] & bit)) elim.push({ index: i, digit: d });
            }
          }
          if (elim.length) return { tech: tech, elim: elim, digit: d, house: 'row' };
        }
      }
      bases = [];
      for (c = 0; c < 9; c++) {
        rows = [];
        for (r = 0; r < 9; r++) {
          i = r * 9 + c;
          if (!state.grid[i] && (state.cands[i] & bit)) rows.push(r);
        }
        if (rows.length >= 2 && rows.length <= size) bases.push({ line: c, cover: rows });
      }
      if (bases.length >= size) {
        combos = combinations(bases, size);
        for (ci = 0; ci < combos.length; ci++) {
          combo = combos[ci];
          unionMap = {};
          union = [];
          for (e = 0; e < combo.length; e++) {
            for (r = 0; r < combo[e].cover.length; r++) {
              rr = combo[e].cover[r];
              if (!unionMap[rr]) { unionMap[rr] = 1; union.push(rr); }
            }
          }
          if (union.length !== size) continue;
          elim = [];
          for (cc = 0; cc < 9; cc++) {
            inBase = false;
            for (e = 0; e < combo.length; e++) if (combo[e].line === cc) inBase = true;
            if (inBase) continue;
            for (r = 0; r < union.length; r++) {
              i = union[r] * 9 + cc;
              if (!state.grid[i] && (state.cands[i] & bit)) elim.push({ index: i, digit: d });
            }
          }
          if (elim.length) return { tech: tech, elim: elim, digit: d, house: 'col' };
        }
      }
    }
    return null;
  }

  function findXYWing(state) {
    var bi = [];
    var i, p, a, b, xy, xz, yz, z, zd, elim, t;
    for (i = 0; i < 81; i++) {
      if (!state.grid[i] && popcount(state.cands[i]) === 2) bi.push(i);
    }
    for (p = 0; p < bi.length; p++) {
      xy = state.cands[bi[p]];
      for (a = 0; a < PEERS[bi[p]].length; a++) {
        i = PEERS[bi[p]][a];
        if (state.grid[i] || popcount(state.cands[i]) !== 2) continue;
        xz = state.cands[i];
        if (popcount(xy & xz) !== 1 || popcount(xy | xz) !== 3) continue;
        for (b = a + 1; b < PEERS[bi[p]].length; b++) {
          t = PEERS[bi[p]][b];
          if (state.grid[t] || popcount(state.cands[t]) !== 2) continue;
          yz = state.cands[t];
          if (popcount(xy | xz | yz) !== 3) continue;
          z = xz & yz;
          if (popcount(z) !== 1 || (z & xy)) continue;
          if (popcount(xy & yz) !== 1) continue;
          zd = digitOfMask(z);
          elim = [];
          for (var n = 0; n < 81; n++) {
            if (state.grid[n] || n === i || n === t) continue;
            if ((state.cands[n] & z) && SEE[n][i] && SEE[n][t]) {
              elim.push({ index: n, digit: zd });
            }
          }
          if (elim.length) {
            return {
              tech: 11,
              elim: elim,
              digit: zd,
              digits: maskDigits(xy | xz | yz),
              cells: [bi[p], i, t]
            };
          }
        }
      }
    }
    return null;
  }

  function findXYZWing(state) {
    var tri = [];
    var bi = [];
    var p, a, b, i, t, xyz, xz, yz, z, zd, elim, n;
    for (i = 0; i < 81; i++) {
      if (state.grid[i]) continue;
      var pc = popcount(state.cands[i]);
      if (pc === 3) tri.push(i);
      else if (pc === 2) bi.push(i);
    }
    for (p = 0; p < tri.length; p++) {
      xyz = state.cands[tri[p]];
      for (a = 0; a < PEERS[tri[p]].length; a++) {
        i = PEERS[tri[p]][a];
        if (state.grid[i] || popcount(state.cands[i]) !== 2) continue;
        xz = state.cands[i];
        if ((xz & xyz) !== xz) continue;
        for (b = a + 1; b < PEERS[tri[p]].length; b++) {
          t = PEERS[tri[p]][b];
          if (state.grid[t] || popcount(state.cands[t]) !== 2) continue;
          yz = state.cands[t];
          if ((yz & xyz) !== yz) continue;
          if ((xz | yz) !== xyz) continue;
          z = xz & yz;
          if (popcount(z) !== 1) continue;
          zd = digitOfMask(z);
          elim = [];
          for (n = 0; n < 81; n++) {
            if (state.grid[n] || n === tri[p] || n === i || n === t) continue;
            if ((state.cands[n] & z) && SEE[n][tri[p]] && SEE[n][i] && SEE[n][t]) {
              elim.push({ index: n, digit: zd });
            }
          }
          if (elim.length) {
            return {
              tech: 12,
              elim: elim,
              digit: zd,
              digits: maskDigits(xyz),
              cells: [tri[p], i, t]
            };
          }
        }
      }
    }
    return null;
  }

  function easiest(state) {
    return findHiddenSingle(state)
      || findNakedSingle(state)
      || findPointing(state)
      || findClaiming(state)
      || findNakedSubset(state, 2, 5)
      || findHiddenSubset(state, 2, 6)
      || findNakedSubset(state, 3, 7)
      || findHiddenSubset(state, 3, 8)
      || findFish(state, 2, 9)
      || findFish(state, 3, 10)
      || findXYWing(state)
      || findXYZWing(state);
  }

  function applyStep(state, step) {
    if (step.place) return place(state, step.place.index, step.place.digit);
    return applyElim(state, step.elim);
  }

  /* Hardest technique required. -1 if this set cannot finish the puzzle.
     If solution is passed, a placed digit that disagrees returns -1. */
  function rate(src, solution) {
    var state = initState(src);
    var maxTech = 0;
    var guard = 0;
    var step;
    if (!state) return -1;
    while (guard++ < 500) {
      if (isSolved(state.grid)) return maxTech;
      step = easiest(state);
      if (!step) return -1;
      if (step.tech > maxTech) maxTech = step.tech;
      if (step.place && solution && solution[step.place.index] && solution[step.place.index] !== step.place.digit) {
        return -1;
      }
      if (!applyStep(state, step)) return -1;
    }
    return -1;
  }

  /* Next deduced cell from a consistent grid. Wrong user digits must already be cleared. */
  function nextHint(src) {
    var state = initState(src);
    var maxTech = 0;
    var cause = null;
    var guard = 0;
    var step;
    if (!state) return null;
    while (guard++ < 500) {
      if (isSolved(state.grid)) return null;
      step = easiest(state);
      if (!step) return null;
      if (step.tech >= maxTech) {
        maxTech = step.tech;
        cause = step;
      }
      if (step.place) {
        return {
          tech: maxTech,
          index: step.place.index,
          digit: step.place.digit,
          info: {
            tech: cause.tech,
            digit: cause.digit || step.place.digit,
            digits: cause.digits || null,
            house: cause.house || null,
            houseIndex: cause.houseIndex,
            cells: cause.cells || null
          }
        };
      }
      if (!applyStep(state, step)) return null;
    }
    return null;
  }

  return { rate: rate, nextHint: nextHint };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SudokuTech;
}
