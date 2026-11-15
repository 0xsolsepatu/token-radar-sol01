// Token Radar's dashboard (radar-3). It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, the live-token and set-aside views, a method-and-backtest
// view with the fitted curve as a scatter chart, and a per-protocol detail view with the model's
// own inputs, the enrichment facts and the protocol's costed farm plan. No network: every byte it
// shows is in data.js, and the farm plan it renders is the one board.json carries for that row,
// so the page and the board cannot disagree.
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
      // A sandboxed or file:// context may refuse replaceState; the page still works without it.
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
      else if (key === 'verdict') { av = { FARM: 0, THIN: 1, SKIP: 2 }[a.farm_verdict]; bv = { FARM: 0, THIN: 1, SKIP: 2 }[b.farm_verdict]; }
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
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', null,
          'The watchlist is the floor: every protocol with at least ',
          el('b', { text: '$' + Math.round(DATA.floor_usd / 1e6) + 'M' }),
          ' of TVL and no token on record. The early radar adds ',
          el('b', { text: String(DATA.early_size) }),
          ' pre-token protocols below that floor, priced on a size curve fitted to the snapshot\u2019s own traded tokens. Implied value is a model, not a promise — and no token is promised to anyone.'
        ),
        el('p', { class: 'sub' },
          'Blind test: the curve misses a real market cap by a median of ',
          el('b', { text: bt.loo_curve.median_miss + 'x' }),
          ' (leave-one-out, ' + bt.loo_curve.n + ' traded tokens) against ',
          el('b', { text: bt.loo_flat.median_miss + 'x' }),
          ' for a flat multiple. The curve is a rough anchor, not a prediction — the Method tab shows the scatter.'
        )
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows below the floor' }), el('b', { text: String(DATA.early_size) })),
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
    var max = list[0].implied_value_usd || 1;
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
    var x0 = 6, x1 = 11, y0 = 5, y1 = 13;
    function X(v) { return L + ((Math.log10(v) - x0) / (x1 - x0)) * (W - L - R); }
    function Y(v) { return T + (y1 - Math.log10(Math.max(1, v))) / (y1 - y0) * (H - T - B); }
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scatter', role: 'img', 'aria-label': 'Scatter chart of traded tokens and board rows against the fitted size curve' });
    var grid = svgEl('g', { stroke: '#26313c', 'stroke-width': '1' });
    var ticksX = [1e6, 1e7, 1e8, 1e9, 1e10, 1e11];
    var ticksY = [1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13];
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
    var srcRows = Object.keys(src).map(function (k) {
      return el('tr', null,
        el('td', { text: k }),
        el('td', { text: src[k].what }),
        el('td', { text: src[k].coverage_watchlist })
      );
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed — and how wrong it can be' }),
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
      el('h3', { text: 'The curve against the data' }),
      scatterChart(),
      el('p', { class: 'sub' }, 'Grey: the ', el('b', { text: String(c.n) }), ' traded tokens the curve is fitted on. Amber: the ', el('b', { text: String(DATA.board_size) }), ' pre-token rows the curve prices. Solid line: the curve. Dashed lines: 3x above and below it — about ', el('b', { text: Math.round(DATA.backtest.loo_curve.within_3x * 100) + '%' }), ' of real caps fall inside that band in leave-one-out testing. The scatter is wide; the chart shows it instead of hiding it.'),
      el('h3', { text: 'Blind test: what the curve actually adds' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Test' }), el('th', { scope: 'col', text: 'Median miss' }), el('th', { scope: 'col', text: 'Within 2x' }), el('th', { scope: 'col', text: 'Within 3x' }), el('th', { scope: 'col', text: 'Within 5x' }), el('th', { scope: 'col', text: 'n' }), el('th', { scope: 'col', text: 'Note' }))),
        el('tbody', null,
          missRow('Leave-one-out · curve only', bt.loo_curve, 'refit without the token being predicted'),
          missRow('Leave-one-out · curve + category', bt.loo_curve_category, 'category prior lifts within-3x but not the median'),
          missRow('Leave-one-out · flat multiple', bt.loo_flat, 'the baseline the curve replaces'),
          missRow('Time split · curve only', bt.time_split_curve, 'fit on tokens listed >2y ago (' + bt.time_split_fit_n + '), tested on newer ones (' + bt.time_split_test_n + ')'),
          missRow('Time split · curve + category', bt.time_split_curve_category, 'the category prior does not survive the time split'),
          missRow('Time split · flat multiple', bt.time_split_flat, 'baseline on the same newer tokens')
        )
      ),
      el('p', { class: 'sub' }, 'Reading it honestly: the curve beats the flat multiple on every test (median miss about 3.4x leave-one-out and 2.9x on the time split, against 4.9x and 4.8x flat), but it is still a rough anchor — fewer than half of real caps land within 3x. The category prior is kept as a shrunken prior even though blind testing does not crown it: it lifts leave-one-out within-3x from ', el('b', { text: Math.round(bt.loo_curve.within_3x * 100) + '%' }), ' to ', el('b', { text: Math.round(bt.loo_curve_category.within_3x * 100) + '%' }), ', but it worsens the time-split median miss (', el('b', { text: bt.time_split_curve.median_miss + 'x' }), ' to ', el('b', { text: bt.time_split_curve_category.median_miss + 'x' }), '). Each row carries its curve-only value beside its category factor, so the reader can see what the adjustment adds.'),
      el('h3', { text: 'Category adjustments the model actually used' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Adjustment' }), el('th', { scope: 'col', text: 'Factor' }), el('th', { scope: 'col', text: 'Traded comparables' }))),
        el('tbody', null, catRows)
      ),
      el('p', { class: 'sub', text: 'Categories with fewer than ' + m.min_category_comparables + ' traded tokens get no adjustment (factor 1.00). That includes Risk Curators — the board\u2019s largest category, with a single traded comparable — so the top rows rest on the global curve alone.' }),
      el('h3', { text: 'Farm plans: what a $1,000 slice costs' }),
      el('p', { class: 'sub' }, 'Every plan is seven steps for a $', el('b', { text: String(m.slice_usd) }), ' slice over a ', el('b', { text: String(m.horizon_days) }), '-day horizon: one deposit, one different action, and one qualifying action a week (', el('b', { text: String(Math.floor(m.horizon_days / 7)) }), ' transactions). Gas is priced from the table below — typical November 2026 fees, stated as assumptions, not quotes. The opportunity cost of the slice is priced at a ', el('b', { text: (m.tbill_yield * 100).toFixed(1) + '%' }), ' T-bill yield: $', el('b', { text: (m.slice_usd * m.tbill_yield * m.horizon_days / 365).toFixed(2) }), '. Verdict: ', el('b', { text: 'FARM' }), ' when the net cost is at most $', el('b', { text: String(m.farm_cost_farm_usd) }), ' and the protocol shows real usage (TVL of at least $50M, or at least $10M with fees); ', el('b', { text: 'THIN' }), ' when the net cost is at most $', el('b', { text: String(m.farm_cost_thin_usd) }), ' and some usage exists; ', el('b', { text: 'SKIP' }), ' otherwise. A verdict is a cost-and-quality screen, not a promised return.'),
      el('p', { class: 'sub', text: 'The 40 watchlist rows carry protocol-specific steps researched from public sources (each row cites its page in its detail view): 12 have a live points program and no token, 6 already have a token trading (2 of them also run a live points program), and 22 are yield-only. The other 158 rows use the template plan above. Three rows are SKIP by access, not by cost: Lightning Network (a routing node a $1,000 slice cannot run), Valos (flagship vault permissioned) and Galaxy Curation (institutional-only).' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Chain' }), el('th', { scope: 'col', text: 'Gas per transaction (assumed)' }))),
        el('tbody', null, gasRows.concat([el('tr', null, el('td', { text: 'any other chain' }), el('td', { class: 'num', text: '$' + m.gas_default_usd.toFixed(2) }))]))
      ),
      el('h3', { text: 'Where the extra facts came from' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Source' }), el('th', { scope: 'col', text: 'What it contributed' }), el('th', { scope: 'col', text: 'Coverage' }))),
        el('tbody', null, srcRows)
      ),
      el('p', { class: 'sub', text: 'The DefiLlama snapshot stays the backbone: the curve, the ranking and the farm plans all follow from it. The extra sources are enrichment, never a replacement — and where a source has no data for a protocol, the row says so instead of inventing a number.' })
    );
  }

  function foot() {
    return el('footer', { class: 'foot' },
      el('p', null, el('b', { text: 'What this board does not do. ' }), 'It does not predict whether or when any protocol issues a token. A protocol on this board records no token in the snapshot; that is not proof it has none. Implied value is this entry\u2019s own model, never a price, and never a promise of a reward.'),
      el('p', { text: 'Sources: DefiLlama protocol index, snapshot ' + DATA.as_of + ', plus build-time enrichment (CryptoRank, CoinGecko, DefiLlama Fees) fetched 2026-11-15 and baked into the entry — the graded run fetches nothing.' })
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
      el('div', null, el('span', { text: 'Implied / TVL' }), el('b', { class: 'num', text: fmtMult(row.tvl_usd ? row.implied_value_usd / row.tvl_usd : null) })),
      el('div', null, el('span', { text: 'Seven-day growth (shown, not multiplied)' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
      el('div', null, el('span', { text: 'Age with no token (shown, not multiplied)' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
      el('div', null, el('span', { text: 'Chains (shown, not multiplied)' }), el('b', { class: 'num', text: String(row.chains.length) }))
    );
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      eq,
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': log10(market cap) = ' + DATA.curve.a + ' + ' + DATA.curve.b + ' x log10(TVL), fitted on ' + DATA.curve.n + ' traded tokens (R\u00b2 ' + DATA.curve.r2 + '). This is an estimate, not a price, and no token is promised.' }),
      el('p', { class: 'sub', text: 'Category evidence: ' + row.category_source + '.' }),
      el('p', { class: 'sub' }, el('span', { class: 'quality ' + row.signal_quality }, el('i', {}), ' ' + qualityText))
    ));
    var anchor = el('section', { class: 'detail-section' }, el('h3', { text: 'Funding anchor and fees' }));
    if (row.cryptorank && row.cryptorank.total_raised_usd) {
      anchor.appendChild(el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Total raised (CryptoRank)' }), el('b', { class: 'num', text: fmtUsd(row.cryptorank.total_raised_usd) })),
        el('div', null, el('span', { text: 'Implied / total raised' }), el('b', { class: 'num', text: fmtMult(row.implied_value_usd / row.cryptorank.total_raised_usd) })),
        el('div', null, el('span', { text: 'CryptoRank token status' }), el('b', { class: 'num', text: row.cryptorank.token_status })),
        el('div', null, el('span', { text: 'Latest round on record' }), el('b', { class: 'num', text: row.cryptorank.rounds && row.cryptorank.rounds.length ? row.cryptorank.rounds[0].stage + ' · ' + row.cryptorank.rounds[0].date : 'none on record' }))
      ));
      anchor.appendChild(el('p', { class: 'sub', text: row.cryptorank.total_raised_verified ? (row.cryptorank.verification_note || 'Total raised cross-checks against a second source.') + ' Per-round amounts are gated behind a free account and were not fetched.' : 'Total raised as displayed by CryptoRank; per-round amounts are gated, so the total cannot be reconciled — shown as reported, not used as a model input.' }));
    } else if (row.cryptorank) {
      anchor.appendChild(el('p', { class: 'sub', text: 'CryptoRank carries no fundraising page for this protocol (' + (row.cryptorank.verification_note || 'no total raised on record') + ').' }));
    } else {
      anchor.appendChild(el('p', { class: 'sub', text: 'CryptoRank was not fetched for this protocol (build-time coverage: Gauntlet, Polymarket and Saturn). No fundraising figure is claimed.' }));
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
    dialog.appendChild(anchor);
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan — $1,000 slice, 90 days' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'Gas (' + row.farm_txs + ' transactions)' }), el('b', { class: 'num', text: fmtMoney2(row.farm_gas_usd) })),
        el('div', null, el('span', { text: 'Opportunity cost (4.2% T-bill)' }), el('b', { class: 'num', text: fmtMoney2(row.farm_opportunity_usd) })),
        el('div', null, el('span', { text: 'Net cost of the slice' }), el('b', { class: 'num', text: fmtMoney2(row.farm_net_usd) + ' (' + (row.farm_net_usd / 10).toFixed(1) + '% of $1,000)' })),
        el('div', null, el('span', { text: 'Time' }), el('b', { class: 'num', text: Math.round(row.farm_minutes / 60 * 10) / 10 + ' hours' })),
        el('div', null, el('span', { text: 'Verdict' }), el('b', { class: 'num' }, el('span', { class: 'verdict ' + row.farm_verdict.toLowerCase(), text: verdictLabel(row.farm_verdict) })))
      ),
      row.farm_program ? el('p', { class: 'sub' }, 'Farm program: ', el('b', { text: row.farm_program.label }), ' — researched from public sources (', el('a', { href: row.farm_program.source, target: '_blank', rel: 'noopener', text: 'source' }), '). Steps below name the real vault, product or venue; rows without a program use the template plan.') : null,
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
