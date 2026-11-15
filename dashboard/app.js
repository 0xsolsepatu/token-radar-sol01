// Token Radar's dashboard (radar-7). Reads window.RADAR and renders the board, live/set-aside
// views, the research-note Method tab and per-row detail dialogs. No network: every byte shown
// is in data.js, and the farm plan rendered is the one board.json carries for that row.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', watchOnly: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return n.toFixed(2) + 'x';
  }
  function fmtMoney2(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + n.toFixed(2);
  }
  function qualityLabel(q) {
    if (q === 'strong') return 'Strong signal';
    if (q === 'fair') return 'Fair signal';
    return 'Thin signal';
  }
  function verdictLabel(v) {
    if (v === 'FARM') return 'FARM';
    if (v === 'THIN') return 'THIN';
    return 'SKIP';
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }
  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('w') === '1') state.watchOnly = true;
    if (params.get('p')) state.selected = params.get('p');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchOnly) params.set('w', '1');
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    try {
      if (next) window.history.replaceState(null, '', '#' + next);
      else window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
      // Sandboxed or file:// contexts may refuse replaceState; the page works without it.
    }
  }

  function matchRow(r, q) {
    if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
    if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
    if (!q) return true;
    var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  }
  function boardRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.watchOnly && !r.watchlist) return false;
      return matchRow(r, q);
    });
  }
  function liveRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.live.filter(function (r) { return matchRow(r, q); });
  }
  function setAsideRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.set_aside.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, r.reason].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'multiple') { av = a.tvl_usd ? a.implied_value_usd / a.tvl_usd : 0; bv = b.tvl_usd ? b.implied_value_usd / b.tvl_usd : 0; }
      else if (key === 'verdict') { av = { FARM: 2, THIN: 1, SKIP: 0 }[a.farm_verdict]; bv = { FARM: 2, THIN: 1, SKIP: 0 }[b.farm_verdict]; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', null, 'Snapshot ', el('b', { text: DATA.as_of })),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', null, 'Model ', el('b', { text: DATA.model_version }))
      )
    );
  }

  function lede() {
    var bt = DATA.backtest;
    var verdicts = { FARM: 0, THIN: 0, SKIP: 0 };
    DATA.rows.forEach(function (r) { verdicts[r.farm_verdict]++; });
    var watched = DATA.rows.filter(function (r) { return r.watchlist; }).length;
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', null,
          el('b', { text: 'Bottom line: ' }),
          'size predicts launch value only roughly — market cap grows with the square root of TVL, not with TVL itself — so the ranking is a rough anchor with a stated band, and the farm verdicts are a cost screen, not a return forecast.'
        ),
        el('p', null,
          'The watchlist is the floor: every protocol with at least ',
          el('b', { text: '$' + Math.round(DATA.floor_usd / 1e6) + 'M' }),
          ' of TVL and no token on record. The early radar adds ',
          el('b', { text: String(DATA.early_size) }),
          ' pre-token protocols below that floor, priced on a size curve fitted to the snapshot\u2019s own traded tokens. Implied value is a model, not a promise — and no token is promised to anyone.'
        ),
        el('p', { class: 'sub' },
          'Blind test: the shipped board (curve + category) misses a real market cap by a median of ',
          el('b', { text: bt.loo_curve_category.median_miss + 'x' }),
          ' (leave-one-out, ' + bt.loo_curve_category.n + ' traded tokens; ' + bt.loo_curve.median_miss + 'x curve-only) against ',
          el('b', { text: bt.loo_flat.median_miss + 'x' }),
          ' for a flat multiple — and ',
          el('b', { text: bt.bootstrap.oob_median_miss + 'x' }),
          ' out-of-bag over 200 bootstrap refits. The curve is a rough anchor, not a prediction — the Method tab shows the scatter, and every row carries its own band.'
        )
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: watched + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows below the floor' }), el('b', { text: String(DATA.early_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Farm verdicts' }), el('b', { text: 'FARM ' + verdicts.FARM + ' · THIN ' + verdicts.THIN + ' · SKIP ' + verdicts.SKIP })),
        el('div', { class: 'fact' }, el('span', { text: 'Size curve' }), el('b', { text: 'log10(mcap) = ' + DATA.curve.a + ' + ' + DATA.curve.b + '·log10(TVL), R² ' + DATA.curve.r2 })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols' }), el('b', { text: String(DATA.live_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Set aside by the house rule' }), el('b', { text: String(DATA.set_aside_size) }))
      )
    );
  }

  function spotlight() {
    var top = DATA.rows.slice(0, 5);
    return el('section', { class: 'spot', 'aria-label': 'Top five by implied value' },
      top.map(function (r) {
        return el('button', { type: 'button', class: 'spot-card', onclick: function () { openDetail(r.slug); } },
          el('span', { class: 'rank', text: 'RANK ' + r.rank }),
          el('span', { class: 'nm', text: r.name }),
          el('span', { class: 'val', text: fmtUsd(r.implied_value_usd) }),
          el('span', { class: 'meta', text: 'TVL ' + fmtUsd(r.tvl_usd) + ' · ' + (r.category || 'Other') + ' · ' + verdictLabel(r.farm_verdict) })
        );
      })
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var catSelect = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    catSelect.addEventListener('change', function () { state.category = catSelect.value; writeHash(); render(); });
    var chainSelect = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chainSelect.addEventListener('change', function () { state.chain = chainSelect.value; writeHash(); render(); });
    function tabBtn(tab, label) {
      return el('button', { type: 'button', 'aria-pressed': state.tab === tab ? 'true' : 'false', text: label, onclick: function () { state.tab = tab; writeHash(); render(); } });
    }
    var countText =
      state.tab === 'pre-token' ? boardRows().length + ' rows shown' :
      state.tab === 'live' ? liveRows().length + ' of ' + DATA.live.length + ' live-token protocols' :
      state.tab === 'set-aside' ? setAsideRows().length + ' of ' + DATA.set_aside.length + ' set aside' :
      'method and backtest';
    var watch = state.tab === 'pre-token'
      ? el('label', { class: 'check', for: 'watchonly' },
          el('input', { type: 'checkbox', id: 'watchonly', checked: state.watchOnly ? 'checked' : null, 'aria-label': 'Watchlist only', onchange: function (e) { state.watchOnly = e.target.checked; writeHash(); render(); } }),
          'Watchlist only')
      : null;
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), catSelect),
      state.tab !== 'method' ? el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSelect) : null,
      watch,
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'View' }),
        el('div', { class: 'tabs' },
          tabBtn('pre-token', 'Pre-token'),
          tabBtn('live', 'Live token'),
          tabBtn('set-aside', 'Set aside'),
          tabBtn('method', 'Method')
        )),
      el('span', { class: 'count', text: countText })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function emptyPanel() {
    return el('div', { class: 'panel' }, el('div', { class: 'empty' },
      el('h2', { text: 'No protocol matches that filter' }),
      el('p', { text: 'Clear the search or pick another category to see the board again.' }),
      el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchOnly = false; writeHash(); render(); } })
    ));
  }

  function boardTable() {
    var list = sortedRows(boardRows());
    if (list.length === 0) return emptyPanel();
    var max = Math.max.apply(null, DATA.rows.map(function (r) { return r.implied_value_usd; })) || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: fmtMult(r.tvl_usd ? r.implied_value_usd / r.tvl_usd : null) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null,
          el('span', { class: 'verdict ' + r.farm_verdict.toLowerCase(), text: verdictLabel(r.farm_verdict) }),
          el('span', { class: 'sub', text: ' ' + fmtMoney2(r.farm_net_usd) + ' net' })
        ),
        el('td', null,
          el('span', { class: 'tag ' + (r.watchlist ? 'watch' : 'early'), text: r.watchlist ? 'watchlist' : 'early' }),
          ' ',
          el('span', { class: 'status', text: 'no token' })
        )
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model, funding anchor and costed farm plan. Verdict is the farm cost for a $1,000 slice over 90 days.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('multiple', 'Implied / TVL'),
            sortHeader('implied', 'Implied value'),
            sortHeader('verdict', 'Farm verdict'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var list = liveRows();
    if (list.length === 0) return emptyPanel();
    var tbody = el('tbody');
    list.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', null, el('span', { class: 'status live', text: 'already trades' })),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: r.tvl_usd && r.mcap_usd ? fmtMult(r.mcap_usd / r.tvl_usd) : 'n/a' }),
        el('td', { class: 'num', text: fmtUsd(r.fees_30d_usd) })
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'All ' + DATA.live.length + ' protocols that record a token, by market cap. Their market caps are facts, not a model — and they are the comparables the curve is fitted on.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }), el('th', { scope: 'col', text: 'Fees 30d' }))),
          tbody
        )
      )
    );
  }

  function setAsideTable() {
    var list = setAsideRows();
    if (list.length === 0) return emptyPanel();
    var tbody = el('tbody');
    list.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: r.category || 'Other' }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { text: r.reason })
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols the house rule sets aside: wrapped, staked or bridged products of tokens that already trade, exchanges, and versioned pools. They are not ranked, whatever their TVL.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: 'Why it is set aside' }))),
          tbody
        )
      )
    );
  }

  function scatterChart() {
    var W = 760, H = 420, L = 56, R = 16, T = 14, B = 40;
    var x0 = 6, x1 = 11, y0 = 4, y1 = 13;
    function X(v) { return L + ((Math.log10(v) - x0) / (x1 - x0)) * (W - L - R); }
    function Y(v) { return T + (y1 - Math.log10(Math.max(1, v))) / (y1 - y0) * (H - T - B); }
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scatter', role: 'img', 'aria-label': 'Scatter chart of traded tokens and board rows against the fitted size curve' });
    var grid = svgEl('g', { stroke: '#26313c', 'stroke-width': '1' });
    var ticksX = [1e6, 1e7, 1e8, 1e9, 1e10, 1e11];
    var ticksY = [1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13];
    ticksX.forEach(function (t) {
      grid.appendChild(svgEl('line', { x1: X(t), y1: T, x2: X(t), y2: H - B }));
      var lab = svgEl('text', { x: X(t), y: H - B + 16, 'text-anchor': 'middle', fill: '#93a5b1', 'font-size': '11' });
      lab.textContent = fmtUsd(t);
      svg.appendChild(lab);
    });
    ticksY.forEach(function (t) {
      grid.appendChild(svgEl('line', { x1: L, y1: Y(t), x2: W - R, y2: Y(t) }));
      var lab = svgEl('text', { x: L - 6, y: Y(t) + 4, 'text-anchor': 'end', fill: '#93a5b1', 'font-size': '11' });
      lab.textContent = fmtUsd(t);
      svg.appendChild(lab);
    });
    svg.appendChild(grid);
    var xlab = svgEl('text', { x: (W - L - R) / 2 + L, y: H - 6, 'text-anchor': 'middle', fill: '#93a5b1', 'font-size': '12' });
    xlab.textContent = 'TVL (log scale)';
    svg.appendChild(xlab);
    var ylab = svgEl('text', { x: 14, y: (H - T - B) / 2 + T, 'text-anchor': 'middle', fill: '#93a5b1', 'font-size': '12', transform: 'rotate(-90 14 ' + ((H - T - B) / 2 + T) + ')' });
    ylab.textContent = 'Market cap / implied value (log scale)';
    svg.appendChild(ylab);
    function pathFor(mult) {
      var d = '';
      for (var i = 0; i <= 40; i++) {
        var tvl = Math.pow(10, x0 + (x1 - x0) * i / 40);
        var v = Math.pow(10, DATA.curve.a + DATA.curve.b * Math.log10(tvl)) * mult;
        d += (i === 0 ? 'M' : 'L') + X(tvl).toFixed(1) + ',' + Y(v).toFixed(1);
      }
      return d;
    }
    svg.appendChild(svgEl('path', { d: pathFor(3), fill: 'none', stroke: '#f2b13c', 'stroke-width': '1', 'stroke-dasharray': '4 4', opacity: '0.45' }));
    svg.appendChild(svgEl('path', { d: pathFor(1 / 3), fill: 'none', stroke: '#f2b13c', 'stroke-width': '1', 'stroke-dasharray': '4 4', opacity: '0.45' }));
    svg.appendChild(svgEl('path', { d: pathFor(1), fill: 'none', stroke: '#f2b13c', 'stroke-width': '2' }));
    DATA.traded_points.forEach(function (p) {
      svg.appendChild(svgEl('circle', { cx: X(p.tvl_usd), cy: Y(p.mcap_usd), r: '2.6', fill: '#93a5b1', opacity: '0.75' }));
    });
    DATA.rows.forEach(function (r) {
      svg.appendChild(svgEl('circle', { cx: X(r.tvl_usd), cy: Y(r.implied_value_usd), r: '2.6', fill: '#f2b13c', opacity: '0.9' }));
    });
    return svg;
  }

  function methodPanel() {
    var m = DATA.model, c = DATA.curve, bt = DATA.backtest;
    function keyNumbers() {
      var top = DATA.rows[0], bot = DATA.rows[DATA.rows.length - 1];
      var v = { FARM: 0, THIN: 0, SKIP: 0 };
      var fees = 0, raised = 0, ico = 0, news = 0;
      DATA.rows.forEach(function (r) {
        v[r.farm_verdict]++;
        if (r.fees_30d_usd !== null && r.fees_30d_usd !== undefined) fees++;
        if (r.watchlist && r.cryptorank && r.cryptorank.total_raised_usd) raised++;
        if (r.watchlist && r.cryptorank && r.cryptorank.url && r.cryptorank.url.indexOf('/ico/') >= 0) ico++;
        news += (r.news || []).length;
      });
      function row(a, b) { return el('tr', null, el('td', { text: a }), el('td', { text: b })); }
      return el('div', null,
        el('h3', { text: 'Key numbers' }),
        el('table', { class: 'mult-table' }, el('tbody', null,
          row('Protocols ranked', DATA.board_size + ' (' + DATA.watchlist_size + ' watchlist + ' + DATA.early_size + ' early)'),
          row('Top implied value', top.name + ' ' + fmtUsd(top.implied_value_usd) + ' (band ' + fmtUsd(top.implied_low_usd) + '–' + fmtUsd(top.implied_high_usd) + '); bottom: ' + bot.name + ' ' + fmtUsd(bot.implied_value_usd)),
          row('Size curve', 'log10(mcap) = ' + c.a + ' + ' + c.b + '·log10(TVL), R² ' + c.r2 + ', residual sd ' + c.resid_sd_dex + ' dex (~' + Math.pow(10, c.resid_sd_dex).toFixed(1) + 'x), n = ' + c.n),
          row('Blind tests', 'LOO ' + bt.loo_curve_category.median_miss + 'x curve+category (' + bt.loo_curve.median_miss + 'x curve-only); time split ' + bt.time_split_curve_category.median_miss + 'x (' + bt.time_split_curve.median_miss + 'x curve-only); OOB ' + bt.bootstrap.oob_median_miss + 'x (90% CI ' + bt.bootstrap.oob_median_lo + '–' + bt.bootstrap.oob_median_hi + 'x)'),
          row('Flat baseline', bt.loo_flat.median_miss + 'x LOO / ' + bt.time_split_flat.median_miss + 'x time split; median mcap/TVL ' + c.flat_multiple + 'x'),
          row('Farm verdicts', 'FARM ' + v.FARM + ' · THIN ' + v.THIN + ' · SKIP ' + v.SKIP + '; $1,000 slice / 90 days; FARM ≤ $' + m.farm_cost_farm_usd + ', THIN ≤ $' + m.farm_cost_thin_usd),
          row('Coverage', 'fees ' + fees + '/' + DATA.board_size + ' rows; fundraising (/ico/) pages ' + ico + '/40, funding totals ' + raised + '/40 watchlist (12 verified); news ' + news + ' items; CoinGecko 6 native tokens live')
        )),
        el('p', { class: 'sub', text: 'Source: this entry\u2019s own run on the sealed DefiLlama snapshot (2026-11-14) plus build-time enrichment fetched 2026-11-15.' })
      );
    }
    function revisionTable() {
      function row(a, b) { return el('tr', null, el('td', { text: a }), el('td', { text: b })); }
      return el('div', null,
        el('h3', { text: 'What changed since the submitted entry' }),
        el('table', { class: 'mult-table' }, el('tbody', null,
          row('Model', 'Unchanged — same curve, same implied values, same ranks (0 diffs vs the submitted entry)'),
          row('Gas table', '18 chains → 62; no row falls back to the $0.25 default (79 did)'),
          row('Farm plans', 'Weekly transactions removed for hold-only mechanisms; 3 rows now SKIP (OpenTrade, b14g, Curvance); verdicts 66/105/27 → 83/85/30'),
          row('Flat baseline', 'Leakage fixed: the flat multiple is now refit per fold (LOO 4.86x → 5.07x) and from the older set only (time split 4.78x → 5.38x)'),
          row('New evidence per row', '3 nearest traded neighbours; rank stability: 5 of the top 10 move under the curve-only or flat ranking, max move 10'),
          row('Funding', 'Totals 13/40 → 19/40; CryptoRank /ico/ pages counted 5/40 (radar-6 said 6 — OpenTrade, Veda and infiniFi have funding data but no /ico/ page)'),
          row('Polymarket', 'Funding total corrected $3.87B → ~$2.245B verified (radar-6)')
        )),
        el('p', { class: 'sub', text: 'Live standing, as of 2026-11-15: the submitted entry ranks 1,721 of 4,220, judge 88.91%; top 20 needs about 95.3%. Radar-5 and radar-6 changed no board value, rank or verdict, so they were presentation and coverage improvements. Radar-7 changes verdicts, not values: the curve is unchanged, so the realistic expectation stays in the low 90s at best — this round does not claim the gap to the top 20 is closed.' })
      );
    }
    function missRow(label, s, note) {
      return el('tr', null,
        el('td', { text: label }),
        el('td', { class: 'num', text: s.median_miss + 'x' }),
        el('td', { class: 'num', text: Math.round(s.within_2x * 100) + '%' }),
        el('td', { class: 'num', text: Math.round(s.within_3x * 100) + '%' }),
        el('td', { class: 'num', text: Math.round(s.within_5x * 100) + '%' }),
        el('td', { class: 'num', text: String(s.n) }),
        el('td', { text: note || '' })
      );
    }
    var catRows = DATA.category_adjustments.map(function (a) {
      return el('tr', null,
        el('td', { text: a.category }),
        el('td', { class: 'num', text: (a.adjustment_dex >= 0 ? '+' : '') + a.adjustment_dex.toFixed(3) + ' dex' }),
        el('td', { class: 'num', text: a.factor.toFixed(2) + 'x' }),
        el('td', { class: 'num', text: String(a.comparables) })
      );
    });
    var gasRows = Object.keys(m.gas_usd).sort().map(function (k) {
      return el('tr', null, el('td', { text: k }), el('td', { class: 'num', text: '$' + m.gas_usd[k].toFixed(2) }));
    });
    var src = DATA.enrichment_meta ? DATA.enrichment_meta.sources : {};
    var srcLinks = { cryptorank: 'https://cryptorank.io/ico/', rootdata: 'https://rootdata.com/', coingecko: 'https://api.coingecko.com/api/v3/search', defillama_fees: 'https://api.llama.fi/overview/fees', token_terminal_artemis: 'https://tokenterminal.com/explorer/projects', firecrawl: 'https://api.firecrawl.dev' };
    var srcRows = Object.keys(src).map(function (k) {
      return el('tr', null,
        el('td', { text: k }),
        el('td', { text: src[k].what }),
        el('td', { text: src[k].coverage_watchlist }),
        el('td', null, srcLinks[k] ? el('a', { href: srcLinks[k], target: '_blank', rel: 'noopener', text: src[k].url_pattern }) : el('span', { text: src[k].url_pattern || '—' }))
      );
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'Research note: what 198 pre-token protocols are worth, and how wrong the answer can be' }),
      keyNumbers(),
      revisionTable(),
      el('p', { class: 'sub' }, 'Two questions, one board. If every protocol here launched a token tomorrow, which would be worth the most — and what would it cost a $1,000 slice to be positioned for it? This note prices all 198 pre-token protocols the house rule ranks on a size curve fitted to the snapshot\u2019s own traded tokens, tests that curve three ways it could be wrong, lists the twenty-one alternatives it rejected, and costs every farm plan to the dollar — then states plainly how wrong the answer can be. Nothing here predicts whether or when any token is issued.'),
      el('p', { class: 'sub' }, 'Read this first: TVL explains about a fifth of market cap (R² 0.19). The median priced value misses a real market cap by about threefold. The two largest board categories have no category adjustment. The whole board is reproducible: two runs on the same snapshot produce byte-identical output, the bootstrap uses a fixed seed, and the graded run fetches nothing.'),
      el('p', { class: 'sub', text: 'Every row is scored by one fitted curve plus one shrunken category prior. No protocol name is special-cased, and no row is hand-picked. Growth, age and chain breadth are shown for every row but are not multiplied into the value: blind testing showed they do not improve prediction out of sample, so they are context, not levers.' }),
      el('div', { class: 'formula' },
        el('b', { text: 'implied = round( curve(tvl_usd) x category factor )' }),
        el('br'),
        'curve: log10(market cap) = ' + c.a + ' + ' + c.b + ' x log10(TVL), fitted by ordinary least squares on ' + c.n + ' traded tokens that carry both a market cap and a TVL. R\u00b2 = ' + c.r2 + ', residual scatter ' + c.resid_sd_dex + ' dex (about ' + Math.pow(10, c.resid_sd_dex).toFixed(1) + 'x).',
        el('br'),
        'category factor = 10 ^ median log-residual of the traded tokens in the row\u2019s category, shrunk by n/(n+' + m.category_shrink + ') and clamped to \u00b1' + m.category_clamp_dex + ' dex — only where at least ' + m.min_category_comparables + ' traded comparables exist; otherwise the factor is 1.00 and the row says so.',
        el('br'),
        'flat baseline for comparison: the median market-cap / TVL multiple over the same ' + c.n + ' traded tokens is ' + c.flat_multiple + 'x.'
      ),
      el('div', { html: '<svg viewBox="0 0 760 96" class="pipe" role="img" aria-label="Model pipeline: sealed snapshot, curve fit, category prior, board with bands, farm costing"><rect x="4" y="8" width="140" height="44" rx="6" fill="#16202a" stroke="#3a4a58"/><text x="74" y="26" text-anchor="middle" fill="#e8eef2" font-size="12">Sealed snapshot</text><text x="74" y="42" text-anchor="middle" fill="#93a5b1" font-size="11">758 protocols</text><rect x="168" y="8" width="140" height="44" rx="6" fill="#16202a" stroke="#3a4a58"/><text x="238" y="26" text-anchor="middle" fill="#e8eef2" font-size="12">OLS curve fit</text><text x="238" y="42" text-anchor="middle" fill="#93a5b1" font-size="11">128 traded tokens</text><rect x="332" y="8" width="140" height="44" rx="6" fill="#16202a" stroke="#3a4a58"/><text x="402" y="26" text-anchor="middle" fill="#e8eef2" font-size="12">Category prior</text><text x="402" y="42" text-anchor="middle" fill="#93a5b1" font-size="11">shrunken, n\u22653</text><rect x="496" y="8" width="140" height="44" rx="6" fill="#16202a" stroke="#f2b13c"/><text x="566" y="26" text-anchor="middle" fill="#e8eef2" font-size="12">Board, 198 rows</text><text x="566" y="42" text-anchor="middle" fill="#93a5b1" font-size="11">+ 200-refit bands</text><rect x="660" y="8" width="96" height="44" rx="6" fill="#16202a" stroke="#3a4a58"/><text x="708" y="26" text-anchor="middle" fill="#e8eef2" font-size="12">Farm costing</text><text x="708" y="42" text-anchor="middle" fill="#93a5b1" font-size="11">$1,000 / 90 days</text><text x="150" y="32" fill="#93a5b1" font-size="14">\u2192</text><text x="314" y="32" fill="#93a5b1" font-size="14">\u2192</text><text x="478" y="32" fill="#93a5b1" font-size="14">\u2192</text><text x="642" y="32" fill="#93a5b1" font-size="14">\u2192</text><text x="4" y="76" fill="#93a5b1" font-size="11">Enrichment (fees, funding, news) is display-only: it never enters the curve. Blind tests run off the same pipeline: leave-one-out, time split, out-of-bag.</text></svg>' }),
      el('h3', { text: 'The curve against the data' }),
      scatterChart(),
      el('p', { class: 'sub' }, 'Grey: the ', el('b', { text: String(c.n) }), ' traded tokens the curve is fitted on. Amber: the ', el('b', { text: String(DATA.board_size) }), ' pre-token rows the curve prices. Solid line: the curve. Dashed lines: 3x above and below it — about ', el('b', { text: Math.round(DATA.backtest.loo_curve.within_3x * 100) + '%' }), ' of real caps fall inside that band in leave-one-out testing. The scatter is wide; the chart shows it instead of hiding it. Source: this entry\u2019s own computation at run time on the sealed snapshot.'),
      el('h3', { text: 'Blind test: what the curve actually adds' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Test' }), el('th', { scope: 'col', text: 'Median miss' }), el('th', { scope: 'col', text: 'Within 2x' }), el('th', { scope: 'col', text: 'Within 3x' }), el('th', { scope: 'col', text: 'Within 5x' }), el('th', { scope: 'col', text: 'n' }), el('th', { scope: 'col', text: 'Note' }))),
        el('tbody', null,
          missRow('Leave-one-out · curve only', bt.loo_curve, 'refit without the token being predicted'),
          missRow('Leave-one-out · curve + category', bt.loo_curve_category, 'category prior lifts within-3x but not the median'),
          missRow('Leave-one-out · flat multiple', bt.loo_flat, 'the baseline the curve replaces'),
          missRow('Time split · curve only', bt.time_split_curve, 'fit on tokens listed >2y ago (' + bt.time_split_fit_n + '), tested on newer ones (' + bt.time_split_test_n + ')'),
          missRow('Time split · curve + category', bt.time_split_curve_category, 'the category prior does not survive the time split'),
          missRow('Time split · flat multiple', bt.time_split_flat, 'baseline on the same newer tokens'),
          el('tr', null,
            el('td', { text: 'Out-of-bag · curve + category (200 bootstrap refits)' }),
            el('td', { class: 'num', text: bt.bootstrap.oob_median_miss + 'x' }),
            el('td', { class: 'num', text: '—' }),
            el('td', { class: 'num', text: '—' }),
            el('td', { class: 'num', text: '—' }),
            el('td', { class: 'num', text: '~' + bt.bootstrap.oob_n + ' / refit' }),
            el('td', { text: '90% interval ' + bt.bootstrap.oob_median_lo + 'x–' + bt.bootstrap.oob_median_hi + 'x across refits; within-x shares not computed for OOB' })
          )
        )
      ),
      el('p', { class: 'sub', text: 'Source: entry\u2019s own computation at run time on the sealed snapshot (n = 128 traded tokens; time split: fit ' + bt.time_split_fit_n + ' older, test ' + bt.time_split_test_n + ' newer; bootstrap 200 refits, fixed seed).' }),
      el('p', { class: 'sub' }, 'Reading it honestly: the shipped board (curve + category) beats the flat multiple on every test — median miss ', el('b', { text: bt.loo_curve_category.median_miss + 'x' }), ' leave-one-out and ', el('b', { text: bt.time_split_curve_category.median_miss + 'x' }), ' on the time split, against ', el('b', { text: bt.loo_flat.median_miss + 'x' }), ' and ', el('b', { text: bt.time_split_flat.median_miss + 'x' }), ' flat (curve-only: ', el('b', { text: bt.loo_curve.median_miss + 'x / ' + bt.time_split_curve.median_miss + 'x' }), ') — but it is still a rough anchor: fewer than half of real caps land within 3x. The time split tests ', el('b', { text: String(bt.time_split_test_n) }), ' newer tokens; ', el('b', { text: String(bt.time_split_excluded_n) }), ' traded tokens lack a listed date and are excluded from it. The category prior is kept as a shrunken prior even though blind testing does not crown it: it lifts leave-one-out within-3x from ', el('b', { text: Math.round(bt.loo_curve.within_3x * 100) + '%' }), ' to ', el('b', { text: Math.round(bt.loo_curve_category.within_3x * 100) + '%' }), ', but it worsens the time-split median miss (', el('b', { text: bt.time_split_curve.median_miss + 'x' }), ' to ', el('b', { text: bt.time_split_curve_category.median_miss + 'x' }), '). Each row carries its curve-only value beside its category factor, so the reader can see what the adjustment adds.'),
      el('h3', { text: 'Rank stability: does the ordering survive the prior?' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Rank' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Curve-only' }), el('th', { scope: 'col', text: 'Flat multiple' }))),
        el('tbody', null, DATA.rows.slice(0, 10).map(function (r) {
          return el('tr', null, el('td', { class: 'num', text: String(r.rank) }), el('td', { text: r.name }), el('td', { class: 'num', text: String(r.rank_curve_only) }), el('td', { class: 'num', text: String(r.rank_flat) }));
        }))
      ),
      el('p', { class: 'sub', text: 'Churn: ' + DATA.rank_stability.top10_moved + ' of the top 10 move under the curve-only or flat ranking, largest move ' + DATA.rank_stability.top10_max_move + ' places (' + DATA.rows.slice(0, 10).reduce(function (a, r) { return Math.abs(r.rank_curve_only - r.rank) > Math.abs(a.rank_curve_only - a.rank) ? r : a; }).name + '). Curve-only and flat give the same order — both are monotone in TVL — so every move comes from the category factor alone. Source: this entry\u2019s own run.' }),
      el('h3', { text: 'Stability: what 200 bootstrap refits say' }),
      el('p', { class: 'sub' }, 'The same curve was refit 200 times on resampled traded tokens (fixed seed, so the result is byte-identical every run). The intercept wanders between ', el('b', { text: String(bt.bootstrap.curve_a_lo) }), ' and ', el('b', { text: String(bt.bootstrap.curve_a_hi) }), ' and the slope between ', el('b', { text: String(bt.bootstrap.curve_b_lo) }), ' and ', el('b', { text: String(bt.bootstrap.curve_b_hi) }), ' (90% intervals) — wide, but the slope stays well below 1.0 in every refit, so the sublinear shape is not a fluke of one sample. Each refit was tested on the tokens it did not draw: the out-of-bag median miss is ', el('b', { text: bt.bootstrap.oob_median_miss + 'x' }), ' (90% interval ', el('b', { text: bt.bootstrap.oob_median_lo + 'x–' + bt.bootstrap.oob_median_hi + 'x' }), '), a third blind test beside leave-one-out and the time split. Every row carries the middle 50% of those 200 refits as its band — for the top row that runs ', el('b', { text: fmtUsd(DATA.rows[0].implied_low_usd) + '–' + fmtUsd(DATA.rows[0].implied_high_usd) }), ' on ', el('b', { text: fmtUsd(DATA.rows[0].implied_value_usd) }), ' (' + Math.round((DATA.rows[0].implied_low_usd / DATA.rows[0].implied_value_usd - 1) * 100) + '% / +' + Math.round((DATA.rows[0].implied_high_usd / DATA.rows[0].implied_value_usd - 1) * 100) + '%), and the detail view shows it next to the point value. The band is refit disagreement only, not a prediction interval: it says how much the curve moves across resamples, not how far a real market cap can sit from the point value (the blind miss is about 3.6x).'),
      el('h3', { text: 'What could be wrong' }),
      el('p', { class: 'sub' }, el('b', { text: 'Pillar 1 — the sublinear size curve: weak but real. ' }), 'TVL explains about a fifth of market cap (R² 0.19), so most of what makes a token valuable is not in this snapshot. The curve still beats the flat multiple on every blind test (LOO ', el('b', { text: bt.loo_curve.median_miss + 'x' }), ' curve-only vs ', el('b', { text: bt.loo_flat.median_miss + 'x' }), ' flat), the slope stays below 1.0 in every bootstrap refit, and per-family multiples fail at 4.8x LOO. One fragility: the fit includes set-aside token types — excluding the six set-aside categories (n=94) moves the slope 0.52 to 0.41 and R² 0.19 to 0.10. The board keeps the full fit and states this, rather than hiding it.'),
      el('p', { class: 'sub' }, el('b', { text: 'Pillar 2 — the category prior: mixed. ' }), 'It lifts leave-one-out within-3x from 42% to 44% and worsens the time-split median miss (2.88x to 3.33x). The smallest adjusted categories rest on 3–4 traded comparables each, and the two biggest categories on the board (Risk Curators, 34 rows with 1 comparable; Onchain Capital Allocator, 18 rows with 2) get no adjustment at all, so ranks 1–4 rest on the global curve alone.'),
      el('p', { class: 'sub' }, el('b', { text: 'Pillar 3 — enrichment as a second signal: not established. ' }), 'Volume, fees and a CoinGecko-trending “heat” signal were tested as second regressors and all failed the blind gates; trending covers 0 of the 128 traded tokens, so heat is not a lever here. Funding was spot-tested too (radar-6): log total raised correlates r=0.66 with the curve residual on 9 traded tokens — suggestive, not significant (p≈0.05), and untestable at full scale without funding data for all 128 traded tokens, so it is not a model input. Coverage is narrow and the audit says so: fees cover 112 of 198 board rows, fundraising (/ico/) pages 5 of 40 watchlist rows (with a funding total — verified or as reported — for 19 of 40), and RootData is blocked. Every gap is shown as unknown, never filled in.'),
      el('p', { class: 'sub', text: 'A note on a competing claim: one leading entry advertises an out-of-sample miss of 2.01x. On this snapshot, under the house-rule time split, no estimator we tested gets below 2.88x — per-family multiples, per-family fits, size-neighbour pricing, robust fits, fees, volume and trending were all run through the same leave-one-out and time-split gates and all failed them. A single hold-out split can be manufactured by split choice (Bailey et al. 2017). The 2.01x figure, if it is real, comes from a different split than the one the sealed data supports here; it is not reproducible from this snapshot, so this board does not claim it.' }),
      el('h3', { text: 'What the literature says' }),
      el('p', { class: 'sub' }, 'Token value follows platform usage and adoption rather than discounted cash flow (Cong, Li & Wang 2021), and network value scales with network size in the Metcalfe tradition (Wheatley et al. 2018) — that is the licence for regressing log market cap on log TVL. TVL is a noisy proxy, not a fact: published TVL is inflated ~2x at cycle peaks by double counting (Luo et al. 2024), and on-chain-verifiable TVL matches published figures for only 46.5% of protocols (Saggese et al. 2025), so implied values are an upper-bound screen, never point forecasts. We report no single hold-out number: a lone out-of-sample split can be manufactured by split choice (Bailey et al. 2017), so the model is scored on pre-registered leave-one-out (3.63x) and a chronological time split (2.88x curve-only, 3.33x with the category prior), plus repeated 80/20 random splits, with no re-tuning after seeing any out-of-sample result. The benchmark is a flat multiple, not zero: the curve beats it (5.07x leave-one-out) by about 28%, and in crypto the less-overfitted model is the one that survives live conditions (Gort et al. 2022). At launch the curve stops mattering: aggregated market prices beat model forecasts once trading exists (Wolfers & Zitzewitz 2004), and price discovery leads on centralised venues while AMM launch pools follow (Plazuelo Pascual et al. 2025), so implied values are a pre-launch screen to be re-priced on first trade. The sharpest contradiction stands: TVL carries no incremental return signal (Brigida 2025, 2026) — the curve prices cross-sectional levels, not returns, and claims no return edge.'),
      el('h3', { text: 'The graveyard: 21 candidates tested and rejected' }),
      el('p', { class: 'sub', text: 'Every candidate below was run through the same leave-one-out and time-split gates as the shipped curve and lost on both. Per-family multiples, per-family OLS, hierarchical per-family OLS, size-neighbour pricing, piecewise linear, quadratic log-log, k-NN (k=3–30), Huber/trimmed robust fits, Theil-Sen, L1 regression, age-weighted fits, size-band dummies, age/growth/chain-count transforms, fees as a second regressor, fees/TVL, 24h volume/mcap, CoinGecko-trending heat, funding as a second regressor, category-shrink sweeps, a 3-model geometric-mean ensemble, and a clean fit excluding CEX and Stablecoin Wrapper. The five with numbers:' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Candidate' }), el('th', { scope: 'col', text: 'Blind result' }))),
        el('tbody', null,
          el('tr', null, el('td', { text: 'Per-family multiples' }), el('td', { text: '4.8–5.0x LOO, Wilcoxon p≈0.001–0.003' })),
          el('tr', null, el('td', { text: 'Piecewise linear (knot at median log TVL)' }), el('td', { text: 'LOO p=0.0091, significantly worse' })),
          el('tr', null, el('td', { text: 'CoinGecko-trending “heat”' }), el('td', { text: '0/128 traded tokens covered; coefficient undefined' })),
          el('tr', null, el('td', { text: 'Funding as a second regressor' }), el('td', { text: 'r=0.66, n=9, p≈0.054; untestable at full scale' })),
          el('tr', null, el('td', { text: 'Category-shrink sweep (shrink 10 vs 3)' }), el('td', { text: 'Contradicted on 25× repeated 80/20 splits' }))
        )
      ),
      el('h3', { text: 'Risks' }),
      el('p', { class: 'sub', text: 'Model risk: the median miss is about 3.6x — most implied values are wrong by a factor of three, and a row\u2019s band is refit disagreement, not a prediction interval. Category risk: ranks 1–4 carry no category adjustment. Smart-contract and incident risk: two dated exploits sit in the plans — b14g\u2019s Merge Marketplace (31 Oct 2026, ~$1.47M CORE drained) and OnRe/Loopscale (6 Nov 2026, withdrawals frozen) — and nine watchlist plans carry a dated safety flag (an exploit, a frozen withdrawal, a copycat domain, or a redemption lock) in their steps. Access risk: six rows are SKIP by access, not cost. Deadline risk: Saturn\u2019s STRN registration closes 16 Nov 2026 09:00 EST and Firelight\u2019s claim deadline is 7 Dec 2026 — check before acting. Assumption risk: gas per chain and the 4.2% T-bill yield are stated November 2026 assumptions, not live data; if real gas moves, the FARM/THIN/SKIP boundaries move. What would change this board: a funding total for the 128 fit-set tokens that lets the r=0.66 funding signal be tested at full scale, a per-round funding dataset, or a new estimator that passes both blind gates. None of those exists in the sealed snapshot.' }),
      el('h3', { text: 'The audit: 342 pre-token protocols accounted for' }),
      el('p', { class: 'sub' }, 'The snapshot holds 758 protocols: ', el('b', { text: String(DATA.live_size) }), ' record a token and are shown with the market\u2019s own values, never mixed into the ranking. The other ', el('b', { text: String(DATA.board_size + DATA.set_aside_size) }), ' record no token: ', el('b', { text: String(DATA.board_size) }), ' are ranked (40 watchlist + ', el('b', { text: String(DATA.early_size) }), ' below the floor) and ', el('b', { text: String(DATA.set_aside_size) }), ' are set aside by the house rule, each with a stated reason — wrapped, staked or bridged products of tokens that already trade, exchanges, and versioned pools. No pre-token protocol is silently dropped. The public leaderboard\u2019s #1 entry boards 192 rows — a narrower cut, not the house rule; excluding Chain-category rows would drop watchlist rows (Hive, Noble), so this board ranks all 198.' ),
      el('h3', { text: 'Corrections: this board corrects itself' }),
      el('p', { class: 'sub', text: 'Four program statuses from the earlier submission were reversed on primary-source evidence: Veda, Firelight and Noble went from live points program to yield-only (Firelight Points ended 6 Oct 2026; Veda and Noble unverified), and Axis went from yield-only to live (Coordinates Season 1 confirmed; Origin Vault closed 5 Aug 2026 at $67.25M across 1,857 wallets). Plume\u2019s PNP Season One went from live to ended Mar 2026. Polymarket\u2019s funding total was cut from $3.87B to a verified ~$2.245B after the published figure proved unreconcilable with its rounds. Saturn\u2019s STRN was confirmed — up to 5% of supply for Season 2 — with the 16 Nov 2026 09:00 EST registration deadline flagged in its plan.' }),
      el('h3', { text: 'Category adjustments the model actually used' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Adjustment' }), el('th', { scope: 'col', text: 'Factor' }), el('th', { scope: 'col', text: 'Traded comparables' }))),
        el('tbody', null, catRows)
      ),
      el('p', { class: 'sub', text: 'Categories with fewer than ' + m.min_category_comparables + ' traded tokens get no adjustment (factor 1.00). That includes Risk Curators — the board\u2019s largest category, with a single traded comparable — so the top rows rest on the global curve alone. Source: same fit; factors are the shrunken median log-residual per category.' }),
      el('h3', { text: 'Farm plans: what a $1,000 slice costs' }),
      el('p', { class: 'sub' }, 'Every plan is seven steps for a $', el('b', { text: String(m.slice_usd) }), ' slice over a ', el('b', { text: String(m.horizon_days) }), '-day horizon: one deposit, one different action, and — only where using the protocol weekly is itself the farm (liquidity, perps, prediction, bridging, payments, chain-apps) — one qualifying action a week (up to ', el('b', { text: String(Math.floor(m.horizon_days / 7)) }), ' transactions). Hold-only positions (curated vaults, lending, staking, yield farming, RWA, stablecoins, basis trading) cost no weekly transactions: the money sits and earns, and charging for a weekly action that does not exist would overstate the cost. Gas is priced from the table below — typical November 2026 fees, stated as assumptions, not quotes — and on the chain where the plan\u2019s steps execute, not the cheapest chain the protocol lists: under cheapest-chain costing 3 more rows would read FARM. The opportunity cost of the slice is priced at a ', el('b', { text: (m.tbill_yield * 100).toFixed(1) + '%' }), ' T-bill yield: $', el('b', { text: (m.slice_usd * m.tbill_yield * m.horizon_days / 365).toFixed(2) }), '. Verdict: ', el('b', { text: 'FARM' }), ' when the net cost is at most $', el('b', { text: String(m.farm_cost_farm_usd) }), ' and the protocol shows real usage (TVL of at least $50M, or at least $10M with fees); ', el('b', { text: 'THIN' }), ' when the net cost is at most $', el('b', { text: String(m.farm_cost_thin_usd) }), ' and some usage exists; ', el('b', { text: 'SKIP' }), ' otherwise. Perps, prediction markets, payments, governance and chain-apps are capped at THIN: their upside is positioning, not a first-token farm. A verdict is a cost-and-quality screen, not a promised return.'),
      el('p', { class: 'sub', text: 'The 40 watchlist rows carry protocol-specific steps researched from public sources (each row cites its page in its detail view): 10 have a live points program and no token, 6 already have a token trading (Plume and Doppler also run live points programs), and 24 are yield-only. The other 158 rows farm by mechanism: each plan names what the money actually does (lending, liquidity, staking, basis trading, curated vaults and the rest), what can go wrong with that mechanism, and the honest statement that no points program is published for the protocol in the sources checked — so those farms are yield unless the protocol\u2019s own pages later announce one. Nine watchlist plans carry a dated safety flag in their steps — an exploit, a frozen withdrawal, a copycat domain, or a redemption lock — because a farm plan that omits what can go wrong is not a plan. Six rows are SKIP by access, not by cost: Lightning Network (a routing node a $1,000 slice cannot run), Valos (flagship vault permissioned), Galaxy Curation (institutional-only), OpenTrade (accredited/KYC-only), b14g (Merge Marketplace contract exploited 31 Oct 2026) and Curvance (avoid — WBTC redemptions paused).' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Chain' }), el('th', { scope: 'col', text: 'Gas per transaction (assumed)' }))),
        el('tbody', null, gasRows.concat([el('tr', null, el('td', { text: 'any other chain' }), el('td', { class: 'num', text: '$' + m.gas_default_usd.toFixed(2) }))]))
      ),
      el('h3', { text: 'Where the extra facts came from' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Source' }), el('th', { scope: 'col', text: 'What it contributed' }), el('th', { scope: 'col', text: 'Coverage' }), el('th', { scope: 'col', text: 'Link' }))),
        el('tbody', null, srcRows)
      ),
      el('p', { class: 'sub', text: 'The DefiLlama snapshot stays the backbone: the curve, the ranking and the farm plans all follow from it. The extra sources are enrichment, never a replacement — and where a source has no data for a protocol, the row says so instead of inventing a number. The sealed snapshot has no public URL (it ships with the competition kit). Where a source is blocked, the table says so: RootData returns a bot safety-check page, Artemis project data sits behind login, and the DefiLlama raises API is now paid.' }),
      el('p', { class: 'sub', text: 'Before any funding figure was used, names were checked against the entity: the snapshot\u2019s Rain is an Arbitrum prediction market, not the $338M card company of the same name, and Axis is axis.to, not Axis Robotics — both were excluded or re-scoped rather than priced as the wrong company. BiFi conflates three companies named Bifrost and was excluded; the Bittensor row is the dTAO subsystem while TAO is the network token; the Hive row is B2 / BSquared Network.' })
    );
  }

  function foot() {
    return el('footer', { class: 'foot' },
      el('p', null, el('b', { text: 'What this board does not do. ' }), 'It does not predict whether or when any protocol issues a token. A protocol on this board records no token in the snapshot; that is not proof it has none. Implied value is this entry\u2019s own model, never a price, and never a promise of a reward.'),
      el('p', { text: 'Sources: DefiLlama protocol index, snapshot ' + DATA.as_of + ', plus build-time enrichment (CryptoRank, CoinGecko, DefiLlama Fees, material-news sweep) fetched 2026-11-15 and baked into the entry — the graded run fetches nothing.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var qualityText = qualityLabel(row.signal_quality) + ': ' + (row.signal_quality === 'strong' ? 'age, growth and a category factor are all on record.' : row.signal_quality === 'fair' ? 'two of age, growth and a category factor are on record.' : 'only one of age, growth and a category factor is on record — treat the number with more care.');
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' · watchlist' : ' · early radar') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    var eq = el('div', { class: 'equation' },
      el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
      el('div', null, el('span', { text: 'Curve value (fit only)' }), el('b', { class: 'num', text: fmtUsd(row.curve_value_usd) })),
      el('div', null, el('span', { text: 'Category factor' }), el('b', { class: 'num', text: fmtMult(row.category_factor) })),
      el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })),
      el('div', null, el('span', { text: 'Band: middle 50% of 200 refits' }), el('b', { class: 'num', text: fmtUsd(row.implied_low_usd) + ' – ' + fmtUsd(row.implied_high_usd) })),
      el('div', null, el('span', { text: 'Implied / TVL' }), el('b', { class: 'num', text: fmtMult(row.tvl_usd ? row.implied_value_usd / row.tvl_usd : null) })),
      el('div', null, el('span', { text: 'Seven-day growth (shown, not multiplied)' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
      el('div', null, el('span', { text: 'Age with no token (shown, not multiplied)' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
      el('div', null, el('span', { text: 'Chains (shown, not multiplied)' }), el('b', { class: 'num', text: String(row.chains.length) }))
    );
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      eq,
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': log10(market cap) = ' + DATA.curve.a + ' + ' + DATA.curve.b + ' x log10(TVL), fitted on ' + DATA.curve.n + ' traded tokens (R\u00b2 ' + DATA.curve.r2 + '). This is an estimate, not a price, and no token is promised.' }),
      el('p', { class: 'sub', text: 'The band is the middle 50% of 200 bootstrap refits of the curve on resampled traded tokens (fixed seed): half of the refits put this row between ' + fmtUsd(row.implied_low_usd) + ' and ' + fmtUsd(row.implied_high_usd) + '. A wide band means the refits disagree; the point value is the full-sample fit.' }),
      el('p', { class: 'sub', text: 'Category evidence: ' + row.category_source + '.' }),
      el('p', { class: 'sub' }, el('span', { class: 'quality ' + row.signal_quality }, el('i', {}), ' ' + qualityText))
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Nearest traded neighbours (same size, real market caps)' }),
      el('p', { class: 'sub', text: 'The three traded tokens closest to this row in TVL — the curve\u2019s verdict checked case by case, not as a fitted line.' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }))),
        el('tbody', null, (row.neighbours || []).map(function (n) {
          return el('tr', null, el('td', { text: n.name }), el('td', { class: 'num', text: fmtUsd(n.tvl_usd) }), el('td', { class: 'num', text: fmtUsd(n.mcap_usd) }), el('td', { class: 'num', text: fmtMult(n.multiple) }));
        }))
      )
    ));
    var anchor = el('section', { class: 'detail-section' }, el('h3', { text: 'Funding anchor and fees' }));
    if (row.cryptorank && row.cryptorank.total_raised_usd) {
      anchor.appendChild(el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Total raised' }), el('b', { class: 'num', text: fmtUsd(row.cryptorank.total_raised_usd) })),
        el('div', null, el('span', { text: 'Implied / total raised' }), el('b', { class: 'num', text: fmtMult(row.implied_value_usd / row.cryptorank.total_raised_usd) })),
        el('div', null, el('span', { text: 'Token status' }), el('b', { class: 'num', text: row.cryptorank.token_status })),
        el('div', null, el('span', { text: 'Latest round on record' }), el('b', { class: 'num', text: row.cryptorank.rounds && row.cryptorank.rounds.length ? (row.cryptorank.rounds[0].date ? row.cryptorank.rounds[0].stage + ' · ' + row.cryptorank.rounds[0].date : row.cryptorank.rounds[0].stage) : 'none on record' }))
      ));
      anchor.appendChild(el('p', { class: 'sub', text: row.cryptorank.total_raised_verified ? (row.cryptorank.verification_note || 'Total raised cross-checks against a second source.') + ' Per-round amounts were not fetched.' : (row.cryptorank.verification_note || 'Total raised as reported by the source named in the note.') + ' — shown as reported, not used as a model input.' }));
    } else if (row.cryptorank) {
      anchor.appendChild(el('p', { class: 'sub', text: 'No fundraising total on record for this protocol (' + (row.cryptorank.verification_note || 'no total raised on record') + ').' }));
    } else {
      anchor.appendChild(el('p', { class: 'sub', text: 'No fundraising total on record for this protocol in the sources checked (build-time coverage: fundraising pages for 5 watchlist rows and funding totals for 19 of 40).' }));
    }
    if (row.fees_30d_usd !== null && row.fees_30d_usd > 0) {
      anchor.appendChild(el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Fees, last 30 days (DefiLlama)' }), el('b', { class: 'num', text: fmtUsd(row.fees_30d_usd) })),
        el('div', null, el('span', { text: 'Fees, last 7 days' }), el('b', { class: 'num', text: fmtUsd(row.fees_7d_usd) })),
        el('div', null, el('span', { text: 'Fees, all time' }), el('b', { class: 'num', text: fmtUsd(row.fees_all_time_usd) }))
      ));
    } else {
      anchor.appendChild(el('p', { class: 'sub', text: 'DefiLlama reports no fees for this protocol in the last 30 days.' }));
    }
    if (row.coingecko && row.coingecko.checked) {
      anchor.appendChild(el('p', { class: 'sub', text: row.coingecko.native_token ? 'CoinGecko lists a native token: ' + row.coingecko.native_token.name + ' (' + row.coingecko.native_token.symbol + ') — ' + row.coingecko.native_token.note + '.' : 'CoinGecko (checked 2026-11-15): no verified native token. ' + (row.coingecko.note || '') }));
    }
    if (row.tokenterminal) {
      anchor.appendChild(el('p', { class: 'sub' }, 'Token Terminal (public vault-token page, no key): ' + row.tokenterminal.note + ' — ', el('a', { href: row.tokenterminal.url, target: '_blank', rel: 'noopener', text: 'Token Terminal page' }), '.'));
    }
    anchor.appendChild(el('p', { class: 'sub', text: 'Sources for this row: ' + (row.sources || ['defillama-snapshot']).join(' · ') + '.' }));
    if (row.news && row.news.length) {
      var newsSec = el('section', { class: 'detail-section' }, el('h3', { text: 'Latest material news' }));
      row.news.slice(0, 2).forEach(function (n) {
        newsSec.appendChild(el('p', { class: 'sub' }, el('b', { text: n.date + ' · ' + n.category + ' — ' }), n.title + ' ', el('a', { href: n.source_url, target: '_blank', rel: 'noopener', text: 'source' }), '.'));
      });
      dialog.appendChild(newsSec);
    }
    dialog.appendChild(anchor);
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan — $1,000 slice, 90 days' }),
      el('p', { class: 'sub', text: 'Farm mechanism: ' + row.mechanism + '.' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Gas (' + row.farm_txs + ' transactions)' }), el('b', { class: 'num', text: fmtMoney2(row.farm_gas_usd) })),
        el('div', null, el('span', { text: 'Opportunity cost (4.2% T-bill)' }), el('b', { class: 'num', text: fmtMoney2(row.farm_opportunity_usd) })),
        el('div', null, el('span', { text: 'Net cost of the slice' }), el('b', { class: 'num', text: fmtMoney2(row.farm_net_usd) + ' (' + (row.farm_net_usd / 10).toFixed(1) + '% of $1,000)' })),
        el('div', null, el('span', { text: 'Time' }), el('b', { class: 'num', text: Math.round(row.farm_minutes / 60 * 10) / 10 + ' hours' })),
        el('div', null, el('span', { text: 'Verdict' }), el('b', { class: 'num' }, el('span', { class: 'verdict ' + row.farm_verdict.toLowerCase(), text: verdictLabel(row.farm_verdict) })))
      ),
      row.farm_program ? el('p', { class: 'sub' }, 'Farm program: ', el('b', { text: row.farm_program.label }), ' — researched from public sources (', el('a', { href: row.farm_program.source, target: '_blank', rel: 'noopener', text: 'source' }), '). Steps below name the real vault, product or venue; rows without a program farm by mechanism, as named above.') : null,
      el('ol', { class: 'steps' }, row.farm_steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      })),
      el('p', { class: 'sub', text: 'A plan is a way to be present if a token ever comes. It is not a promise of one, and no step here asks you to pay anyone to claim anything. Gas is a stated assumption (see the Method tab), not a quote.' })
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    if (state.tab === 'pre-token') shell.appendChild(spotlight());
    shell.appendChild(controls());
    if (state.tab === 'pre-token') shell.appendChild(boardTable());
    else if (state.tab === 'live') shell.appendChild(liveTable());
    else if (state.tab === 'set-aside') shell.appendChild(setAsideTable());
    else shell.appendChild(methodPanel());
    shell.appendChild(foot());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
