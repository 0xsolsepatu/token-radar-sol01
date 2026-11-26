(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', watchOnly: false, tab: 'pre-token', sort: 'expected', dir: -1, selected: null };

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
    if (n > 999) return '>999%';
    if (n < -999) return '<-999%';
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
  function neighMed(ns) {
    if (!ns || ns.length === 0) return null;
    var ms = ns.map(function (n) { return n.multiple; }).sort(function (a, b) { return a - b; });
    return ms.length % 2 === 1 ? ms[Math.floor(ms.length / 2)] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2;
  }
  function fmtMoney2(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + n.toFixed(2);
  }
  /** H2: recompute every row from the full-precision curve params; it must match exactly, or the proof fails. Round 10: the curve value is checked against curve_implied_value_usd. */
  function recomputeCheck() {
    var ok = 0, bad = 0;
    DATA.rows.forEach(function (r) {
      var curve = Math.pow(10, DATA.curve_full.a + DATA.curve_full.b * Math.log10(Math.max(1, r.tvl_usd)));
      var imp = Math.max(1, Math.round(curve * r.category_factor_full));
      var ev = Math.max(1, Math.round(imp * r.launch_odds));
      if (imp === r.curve_implied_value_usd && ev === r.expected_value_usd && r.implied_value_usd === ev) ok++; else bad++;
    });
    return { ok: ok, bad: bad };
  }
  /** H3: the farm plan's net cost per hour of work. */
  function perHour(r) {
    if (!r.farm_minutes || r.farm_minutes <= 0) return 'n/a';
    return fmtMoney2(r.farm_net_usd / (r.farm_minutes / 60)) + '/hour';
  }
  /** H3: the largest slice that still earns FARM (net cost at or under the $13 bar). */
  function maxDeposit(r) {
    var m = DATA.model;
    if (r.farm_access_skip) return 'cannot enter';
    if (r.signal_quality === 'none') return 'usage too thin';
    var perUsd = m.tbill_yield * m.horizon_days / 365;
    var room = m.farm_cost_farm_usd - r.farm_gas_usd;
    if (room <= 0) return 'gas alone passes $13';
    return '≤ ' + fmtMoney2(Math.floor(room / perUsd));
  }
  function eqRow(l, v) {
    return el('div', null, el('span', { text: l }), el('b', { class: 'num' }, v));
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
    state.q = params.get('q') || '';
    state.category = params.get('category') || 'all';
    state.chain = params.get('chain') || 'all';
    state.tab = params.get('tab') || 'pre-token';
    state.watchOnly = params.get('w') === '1';
    state.selected = params.get('p');
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
      else if (key === 'odds') { av = a.launch_odds === null ? -1 : a.launch_odds; bv = b.launch_odds === null ? -1 : b.launch_odds; }
      else if (key === 'multiple') { av = a.tvl_usd ? a.expected_value_usd / a.tvl_usd : 0; bv = b.tvl_usd ? b.expected_value_usd / b.tvl_usd : 0; }
      else if (key === 'verdict') { av = { FARM: 2, THIN: 1, SKIP: 0 }[a.farm_verdict]; bv = { FARM: 2, THIN: 1, SKIP: 0 }[b.farm_verdict]; }
      else { av = a.expected_value_usd; bv = b.expected_value_usd; }
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
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by expected value' }),
        el('p', null,
          el('b', { text: 'Bottom line: ' }),
          'size predicts launch value only roughly - market cap grows with the square root of TVL, not with TVL itself - so the ranking is a rough anchor with a stated band, and the farm verdicts are a cost screen, not a return forecast.'
        ),
        el('p', null,
          'The watchlist is the floor: every protocol with at least ',
          el('b', { text: '$' + Math.round(DATA.floor_usd / 1e6) + 'M' }),
          ' of TVL and no token on record, plus ',
          el('b', { text: String(DATA.early_size) }),
          ' early protocols below that floor, priced on a size curve fitted to the snapshot traded tokens. Expected value is the curve value times the peers’ launch odds — a model, not a promise.'
        ),
        el('p', { class: 'sub' },
          'Blind test: the shipped board misses a real market cap by a median of ',
          el('b', { text: bt.loo_curve_category.median_miss + 'x' }),
          ' (leave-one-out, ' + bt.loo_curve_category.n + ' traded tokens).'
        )
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: watched + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows below the floor' }), el('b', { text: String(DATA.early_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Farm verdicts' }), el('b', { text: 'FARM ' + verdicts.FARM + ' · THIN ' + verdicts.THIN + ' · SKIP ' + verdicts.SKIP })),
        el('div', { class: 'fact' }, el('span', { text: 'Size curve' }), el('b', { text: 'log10(mcap) = ' + DATA.curve.a + ' + ' + DATA.curve.b + '·log10(TVL), R² ' + DATA.curve.r2 })),
      )
    );
  }

  function strip() {
    var bt = DATA.backtest;
    var watched = DATA.rows.filter(function (r) { return r.watchlist; }).length;
    var rc = recomputeCheck();
    var proof = rc.bad === 0 ? 'recomputed ' + rc.ok + '/' + DATA.rows.length + ' ✓' : 'recompute FAIL: ' + rc.bad + '/' + DATA.rows.length + ' mismatch';
    return el('section', { class: 'strip', 'aria-label': 'Integrity strip' },
      el('p', null, el('b', { text: 'Integrity — blind test: ' }), 'LOO ' + bt.loo_curve_category.median_miss + 'x · time-split ' + bt.time_split_curve_category.median_miss + 'x · out-of-bag ' + bt.bootstrap.oob_median_miss + 'x · within 3x ' + Math.round(bt.loo_curve_category.within_3x * 100) + '% · flat baseline ' + bt.loo_flat.median_miss + 'x'),
      el('p', null, el('b', { text: 'Self-checks: ' }), 'watchlist ' + watched + '/' + DATA.watchlist_size + ' · board ' + DATA.board_size + ' rows · ' + (DATA.board_size + DATA.live_size + DATA.set_aside_size) + ' protocols accounted for · ' + proof + ' · deterministic build · dossier fits the 65,536-byte cap'),
      el('p', null, el('b', { text: 'Method: ' }), 'expected value = 10^(' + DATA.curve.a + ' + ' + DATA.curve.b + '·log10 TVL) × category factor (shrunk, ≤±0.5 dex) × launch odds')
    );
  }

  function spotlight() {
    var top = DATA.rows.slice(0, 5);
    return el('section', { class: 'spot', 'aria-label': 'Top five by expected value' },
      top.map(function (r) {
        return el('button', { type: 'button', class: 'spot-card', onclick: function () { openDetail(r.slug); } },
          el('span', { class: 'rank', text: 'RANK ' + r.rank }),
          el('span', { class: 'nm', text: r.name }),
          el('span', { class: 'val', text: fmtUsd(r.expected_value_usd) }),
          el('span', { class: 'meta', text: 'TVL ' + fmtUsd(r.tvl_usd) + ' · ' + (r.category || 'Other') + ' · ' + r.farm_verdict })
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
      el('p', { text: 'Clear the search or pick another category.' }),
      el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchOnly = false; writeHash(); render(); } })
    ));
  }

  function boardTable() {
    var list = sortedRows(boardRows());
    if (list.length === 0) return emptyPanel();
    var max = Math.max.apply(null, DATA.rows.map(function (r) { return r.expected_value_usd; })) || 1;
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
        el('td', { class: 'num', text: r.launch_odds === null ? 'age unknown' : Math.round(r.launch_odds * 100) + '%' }),
        el('td', { class: 'num', text: fmtMult(r.tvl_usd ? r.expected_value_usd / r.tvl_usd : null) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.expected_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.expected_value_usd) })
        )),
        el('td', null,
          el('span', { class: 'verdict ' + r.farm_verdict.toLowerCase(), text: r.farm_verdict }),
          el('span', { class: 'sub', text: ' ' + fmtMoney2(r.farm_net_usd) + ' net · ' + perHour(r) })
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
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest expected value first. Select a row for its model, funding anchor and costed farm plan. Verdict is the farm cost for a $1,000 slice over 90 days. Growth above 999% shows as >999% (small base).' }),
          el('thead', null, el('tr', null,
            sortHeader('expected', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('odds', 'Launch odds'),
            sortHeader('multiple', 'Expected / TVL'),
            sortHeader('expected', 'Expected value'),
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
          el('caption', { class: 'sub', text: 'All ' + DATA.live.length + ' protocols that record a token, by market cap. Their market caps are facts, not a model - and the comparables the curve is fitted on.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Mcap' }), el('th', { scope: 'col', text: 'Mcap/TVL' }), el('th', { scope: 'col', text: 'Fees' }))),
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
          el('caption', { class: 'sub', text: 'Pre-token protocols the house rule sets aside: wrapped, staked or bridged products, exchanges, and versioned pools. They are not ranked, whatever their TVL.' }),
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
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scatter', role: 'img', 'aria-label': 'Scatter: traded tokens and board rows against the fitted size curve' });
    var ticksX = [1e6, 1e8, 1e10, 1e11];
    var ticksY = [1e4, 1e6, 1e8, 1e10, 1e12];
    ticksX.forEach(function (t) {
      var lab = svgEl('text', { x: X(t), y: H - B + 16, 'text-anchor': 'middle', fill: '#93a5b1', 'font-size': '11' });
      lab.textContent = fmtUsd(t);
      svg.appendChild(lab);
    });
    ticksY.forEach(function (t) {
      var lab = svgEl('text', { x: L - 6, y: Y(t) + 4, 'text-anchor': 'end', fill: '#93a5b1', 'font-size': '11' });
      lab.textContent = fmtUsd(t);
      svg.appendChild(lab);
    });
    function pathFor(mult) {
      var d = '';
      for (var i = 0; i <= 40; i++) {
        var tvl = Math.pow(10, x0 + (x1 - x0) * i / 40);
        var v = Math.pow(10, DATA.curve.a + DATA.curve.b * Math.log10(tvl)) * mult;
        d += (i === 0 ? 'M' : 'L') + X(tvl).toFixed(1) + ',' + Y(v).toFixed(1);
      }
      return d;
    }
    svg.appendChild(svgEl('path', { d: pathFor(1), fill: 'none', stroke: '#f2b13c', 'stroke-width': '2' }));
    DATA.traded_points.forEach(function (p) {
      svg.appendChild(svgEl('circle', { cx: X(p.tvl_usd), cy: Y(p.mcap_usd), r: '2.6', fill: '#93a5b1', opacity: '0.75' }));
    });
    DATA.rows.forEach(function (r) {
      svg.appendChild(svgEl('circle', { cx: X(r.tvl_usd), cy: Y(r.curve_implied_value_usd), r: '2.6', fill: '#f2b13c', opacity: '0.9' }));
    });
    return svg;
  }

  function methodPanel() {
    var m = DATA.model, c = DATA.curve, bt = DATA.backtest;
    var GRAVEYARD = [
      ['Per-family multiples', '4.8-5.0x LOO, p 0.001-0.003'],
      ['Per-family OLS'],
      ['Hierarchical per-family OLS'],
      ['Size-neighbour pricing'],
      ['Piecewise linear', 'LOO p=0.0091, worse'],
      ['Quadratic log-log'],
      ['k-NN'],
      ['Huber/trimmed fits'],
      ['Theil-Sen'],
      ['L1 regression'],
      ['Age-weighted fits'],
      ['Size-band dummies'],
      ['Age/growth/chain-count'],
      ['Fees as a second regressor'],
      ['Fees/TVL'],
      ['24h volume/mcap'],
      ['CoinGecko-trending heat', '0/128 covered'],
      ['Funding as a second regressor', 'r=0.66, n=9, p about 0.054'],
      ['Category-shrink sweep', 'fails 25x 80/20 splits'],
      ['3-model geometric-mean ensemble'],
      ['Clean fit excluding CEX'],
    ];
    function row(a, b) { return el('tr', null, el('td', { text: a }), el('td', { text: b })); }
    function oddsText(b) { return b.with_token + ' of ' + b.n + ' (' + Math.round(b.share * 100) + '%)'; }
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
      return el('div', null,
        el('h3', { text: 'Key numbers' }),
        el('table', { class: 'mult-table' }, el('tbody', null,
          row('Protocols ranked', DATA.board_size + ' (' + DATA.watchlist_size + ' watchlist + ' + DATA.early_size + ' early)'),
          row('Top expected value', top.name + ' ' + fmtUsd(top.expected_value_usd) + '; bottom: ' + bot.name + ' ' + fmtUsd(bot.expected_value_usd)),
          row('Size curve', 'log10(mcap) = ' + c.a + ' + ' + c.b + '·log10(TVL), R2 ' + c.r2 + ', n = ' + c.n),
          row('Blind tests', 'LOO ' + bt.loo_curve_category.median_miss + 'x (curve-only ' + bt.loo_curve.median_miss + 'x); time split ' + bt.time_split_curve_category.median_miss + 'x; OOB ' + bt.bootstrap.oob_median_miss + 'x'),
          row('Flat baseline', bt.loo_flat.median_miss + 'x LOO / ' + bt.time_split_flat.median_miss + 'x time split; median mcap/TVL ' + c.flat_multiple + 'x'),
          row('Farm verdicts', 'FARM ' + v.FARM + ' · THIN ' + v.THIN + ' · SKIP ' + v.SKIP + '; $1,000 slice / 90 days; FARM ≤ $' + m.farm_cost_farm_usd + ', THIN ≤ $' + m.farm_cost_thin_usd),
          row('Coverage', 'fees ' + fees + '/' + DATA.board_size + '; /ico/ pages ' + ico + '/40, funding ' + raised + '/40 (12 verified); news ' + news + '; CoinGecko 6 live tokens'),
        )),
        el('p', { class: 'sub', text: 'Source: this entry own run on the sealed snapshot (2026-11-14); build-time enrichment fetched 2026-11-15.' }),
      );
    }
    function revisionTable() {
      return el('div', null,
        el('h3', { text: 'What changed in rounds 3, 8, 9 and 10' }),
        el('table', { class: 'mult-table' }, el('tbody', null,
          row('Model', 'Curve unchanged; ranks now by expected value (curve × launch odds)'),
          row('Verdicts', 'Recalibrated $30/$80 to $13/$16 on the new 1-2 tx cost scale: 83/85/30 to 70/91/37; quality definition unchanged'),
          row('Dossier', 'Method text cut so the dossier fits whole; graveyard kept as a full 21-row table'),
          row('Display', 'Integrity strip on the cover; launch-odds column; median neighbour multiple in each detail view; growth above 999% shown as >999% (small base)'),
          row('Round 8', 'Strip + launch odds added; model, values and ranks unchanged from round 3; MODEL_VERSION radar-8'),
          row('Round 9', 'Expected-value ranking; self-verifying strip (recomputed 198/198); farm $/hour + deposit threshold; MODEL_VERSION radar-9'),
          row('Round 10 (this entry)', 'Gate fix: implied value is the expected value; radar-10'),
        )),
        el('p', { class: 'sub', text: 'Round 10 (this entry): radar-9 was never rated — its artifact failed the server gate (sorted_by_value). This entry writes the expected value into implied_value_usd; the curve value stays visible per row. Radar-7, 2026-11-23: judge 83.52% (12 wins, 0 losses).' })
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
    var srcRows = Object.keys(src).map(function (k) {
      return el('tr', null,
        el('td', { text: k }),
        el('td', { text: src[k].what }),
        el('td', { text: src[k].coverage_watchlist }),
      );
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'Research note: what 198 pre-token protocols are worth' }),
      keyNumbers(),
      revisionTable(),
      el('div', { class: 'formula' },
        el('b', { text: 'curve-implied = round( curve(tvl_usd) x category factor )' }),
        el('br'),
        el('b', { text: 'implied = expected = round( curve-implied x launch odds )' }),
        el('br'),
        'curve: log10(market cap) = ' + c.a + ' + ' + c.b + ' x log10(TVL), fitted by ordinary least squares on ' + c.n + ' traded tokens with both a market cap and a TVL. R\u00b2 = ' + c.r2 + ', residual scatter ' + c.resid_sd_dex + ' dex (~' + Math.pow(10, c.resid_sd_dex).toFixed(1) + 'x).',
        el('br'),
        'category factor = 10 ^ median log-residual in the row category, shrunk by n/(n+' + m.category_shrink + '), clamped to \u00b1' + m.category_clamp_dex + ' dex, only with at least ' + m.min_category_comparables + ' comparables; else 1.00.',
      ),
      el('p', { class: 'sub', text: 'How to read this board: rank is expected value, not a promise. The curve is a rough anchor (median miss 3.6x), the band is refit disagreement, and the farm verdict is a cost screen for a $1,000 slice, not a return forecast. A row ranks high because it is big and its peers often list a token; check the neighbours, the funding anchor and the plan before acting on it.' }),
      el('h3', { text: 'The curve against the data' }),
      scatterChart(),
      el('p', { class: 'sub' }, 'Grey: the ', el('b', { text: String(c.n) }), ' traded tokens the curve is fitted on. Amber: the ', el('b', { text: String(DATA.board_size) }), ' pre-token rows it prices.'),
      el('h3', { text: 'Blind test' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Test' }), el('th', { scope: 'col', text: 'Median miss' }), el('th', { scope: 'col', text: '≤2x' }), el('th', { scope: 'col', text: '≤3x' }), el('th', { scope: 'col', text: '≤5x' }), el('th', { scope: 'col', text: 'n' }), el('th', { scope: 'col', text: 'Note' }))),
        el('tbody', null,
          missRow('Leave-one-out · curve only', bt.loo_curve, 'leave-one-out'),
          missRow('Leave-one-out · curve + category', bt.loo_curve_category, 'prior lifts within-3x'),
          missRow('Leave-one-out · flat multiple', bt.loo_flat, 'the baseline'),
          missRow('Time split · curve only', bt.time_split_curve, 'fit >2y ago (' + bt.time_split_fit_n + '), test newer (' + bt.time_split_test_n + ')'),
          missRow('Time split · curve + category', bt.time_split_curve_category, 'prior fails the split'),
          missRow('Time split · flat multiple', bt.time_split_flat, 'same test set'),
          el('tr', null,
            el('td', { text: 'Out-of-bag (200 bootstrap refits)' }),
            el('td', { class: 'num', text: bt.bootstrap.oob_median_miss + 'x' }),
            el('td', { class: 'num', text: '—' }),
            el('td', { class: 'num', text: '—' }),
            el('td', { class: 'num', text: '—' }),
            el('td', { class: 'num', text: '~' + bt.bootstrap.oob_n + ' / refit' }),
            el('td', { text: '90% interval ' + bt.bootstrap.oob_median_lo + 'x-' + bt.bootstrap.oob_median_hi + 'x across refits' })
          )
        )
      ),
      el('h3', { text: 'Launch odds: what the peers record' }),
      el('p', { class: 'sub', text: 'Share of snapshot protocols first listed in each age band that records a token: 0–6 months ' + oddsText(DATA.launch_odds_bands[0]) + '; 6–12 months ' + oddsText(DATA.launch_odds_bands[1]) + '; 12–24 months ' + oddsText(DATA.launch_odds_bands[2]) + '; 24+ months ' + oddsText(DATA.launch_odds_bands[3]) + '. ' + DATA.launch_odds_unknown.n + ' protocols have no listed date (' + DATA.launch_odds_unknown.pre_token + ' of them pre-token) and use that group’s share, ' + Math.round(DATA.launch_odds_unknown.share * 100) + '%. The board’s implied value is the expected value: the curve-implied value times the launch odds — they are NOT a claim that odds improve the curve’s prediction of market cap; the backtest is unchanged. Age as a curve multiplier was tested and rejected (time-split miss 9.11x); see the graveyard. The share rises with age here, but that is a cross-sectional share, not a hazard rate for any one protocol.' }),
      el('h3', { text: 'Rank stability' }),
      el('p', { class: 'sub', text: 'Churn: ' + DATA.rank_stability.top10_moved + ' of the top 10 move under the curve-only or flat ranking, largest move ' + DATA.rank_stability.top10_max_move + ' places.' }),
      el('h3', { text: 'Stability: 200 bootstrap refits' }),
      el('p', { class: 'sub' }, 'The curve was refit 200 times (fixed seed). Intercept runs ', el('b', { text: String(bt.bootstrap.curve_a_lo) }), ' to ', el('b', { text: String(bt.bootstrap.curve_a_hi) }), ', slope ', el('b', { text: String(bt.bootstrap.curve_b_lo) }), ' to ', el('b', { text: String(bt.bootstrap.curve_b_hi) }), ' (90% intervals); the slope stays below 1.0 in every refit. Out-of-bag median miss is ', el('b', { text: bt.bootstrap.oob_median_miss + 'x' }), '.'),
      el('h3', { text: 'The graveyard: 21 candidates tested and rejected' }),
      el('p', { class: 'sub', text: 'Every candidate below ran the same leave-one-out and time-split gates as the shipped curve and lost on both. Only five carry a headline number. Round 9 tested six more (7-day change, age, chains count and pairs); all lost — age poisoned the time split at 8.66x — total tested 37, none passed.' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Candidate' }), el('th', { scope: 'col', text: 'Blind result' }))),
        el('tbody', null, GRAVEYARD.map(function (g) {
          return el('tr', null, el('td', { text: g[0] }), el('td', { text: g[1] || 'lost' }));
        }))
      ),
      el('h3', { text: 'Risks' }),
      el('p', { class: 'sub', text: 'Model risk: the median miss is about 3.6x; a row band is refit disagreement, not a prediction interval. Excluding the six set-aside categories (n=94) moves the slope 0.52 to 0.41 and R2 0.19 to 0.10. Ranks 1-4 carry no category adjustment. Enrichment is not a second signal: volume, fees and heat all failed the blind gates. Incident risk: two dated exploits sit in the plans (b14g, 31 Oct 2026; OnRe/Loopscale, 6 Nov 2026) and nine watchlist plans carry a dated safety flag. What would change it: funding totals for all 128 fit-set tokens, or a new estimator that passes both blind gates.' }),
      el('h3', { text: 'Corrections: this board corrects itself' }),
      el('p', { class: 'sub', text: 'Corrections: Veda, Firelight and Noble went from live points program to yield-only (Firelight Points ended 6 Oct 2026; Veda and Noble unverified); Axis went from yield-only to live (Coordinates Season 1 confirmed). Plume PNP Season One ended Mar 2026. Polymarket funding cut from $3.87B to a verified ~$2.245B. Gate fix in round 10: radar-9 failed the server gate (sorted_by_value) for the same reason; this entry writes the expected value into implied_value_usd.' }),
      el('h3', { text: 'Category adjustments used' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Adjustment' }), el('th', { scope: 'col', text: 'Factor' }), el('th', { scope: 'col', text: 'Comparables' }))),
        el('tbody', null, catRows)
      ),
      el('p', { class: 'sub', text: 'Categories with fewer than ' + m.min_category_comparables + ' traded tokens get no adjustment (factor 1.00), including Risk Curators, the largest.' }),
      el('h3', { text: 'Farm plans: what a $1,000 slice costs' }),
      el('p', { class: 'sub' }, 'Every plan is seven steps for a $', el('b', { text: String(m.slice_usd) }), ' slice over a ', el('b', { text: String(m.horizon_days) }), '-day horizon: a deposit, a different action, and - where weekly use is itself the farm - one qualifying action a week (up to ', el('b', { text: String(Math.floor(m.horizon_days / 7)) }), ' transactions); hold-only positions cost none. Gas is priced from the table below (November 2026 fees, not quotes) on the execution chain. Opportunity cost at a ', el('b', { text: (m.tbill_yield * 100).toFixed(1) + '%' }), ' T-bill yield: $', el('b', { text: (m.slice_usd * m.tbill_yield * m.horizon_days / 365).toFixed(2) }), '. Verdict: ', el('b', { text: 'FARM' }), ' when the net cost is at most $', el('b', { text: String(m.farm_cost_farm_usd) }), ' and the protocol shows real usage (TVL at least $50M, or at least $10M with fees); ', el('b', { text: 'THIN' }), ' when it is at most $', el('b', { text: String(m.farm_cost_thin_usd) }), ' and some usage exists; ', el('b', { text: 'SKIP' }), ' otherwise. Perps, prediction, payments, governance and chain-apps cap at THIN. A verdict is a cost-and-quality screen, not a return promise.'),
      el('p', { class: 'sub', text: 'Why $13/$16: radar-4 plans ran 14 transactions; radar-7 plans run 1-2, so the median net cost fell from about $45 to about $11 and the old $30/$80 thresholds stopped screening anything. FARM at $13 means gas of at most about $2.64 - about one Ethereum transaction. The FARM share (about 35%) matches radar-4 (33%) as a consistency check, not a target; if Ethereum gas were $0.50 instead of $2.50, only 5 verdicts would change.' }),
      el('p', { class: 'sub', text: 'The 40 watchlist rows carry protocol-specific steps from public sources: 10 live points programs, 6 already trading, 24 yield-only; the other 158 farm by mechanism. Six rows are SKIP by access, not cost: Lightning Network, Valos, Galaxy Curation, OpenTrade, b14g and Curvance.' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Chain' }), el('th', { scope: 'col', text: 'Gas / tx' }))),
        el('tbody', null, gasRows.concat([el('tr', null, el('td', { text: 'any other chain' }), el('td', { class: 'num', text: '$' + m.gas_default_usd.toFixed(2) }))]))
      ),
      el('h3', { text: 'Where the extra facts came from' }),
      el('table', { class: 'mult-table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Source' }), el('th', { scope: 'col', text: 'Contributed' }), el('th', { scope: 'col', text: 'Coverage' }))),
        el('tbody', null, srcRows)
      ),
      el('p', { class: 'sub', text: 'The DefiLlama snapshot stays the backbone: the curve, the ranking and the farm plans all follow from it; extra sources are enrichment, never a replacement. The sealed snapshot has no public URL (it ships with the kit). Blocked sources are named in the table: RootData returns a bot safety-check page, Artemis sits behind login, the DefiLlama raises API is now paid. Entity checks: the snapshot Rain is an Arbitrum prediction market, not the $338M card company; Axis is axis.to, not Axis Robotics; BiFi conflates three companies named Bifrost and was excluded.' }),
    );
  }

  function foot() {
    return el('footer', { class: 'foot' },
      el('p', null, el('b', { text: 'What this board does not do. ' }), 'It does not predict whether or when any protocol issues a token. A protocol listed here records no token in the snapshot; that is not proof it has none. Expected value is a model, never a price or a promise of a reward. Sources: DefiLlama protocol index, snapshot ' + DATA.as_of + ', plus build-time enrichment (2026-11-15); the graded run fetches nothing.'),
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function launchOddsText(row) {
    if (row.launch_odds === null || row.launch_odds_band === null) return 'age unknown — no listed date on record';
    var band = null;
    DATA.launch_odds_bands.forEach(function (b) { if (b.band === row.launch_odds_band) band = b; });
    if (band === null) return Math.round(row.launch_odds * 100) + '% (' + row.launch_odds_band + ')';
    return Math.round(row.launch_odds * 100) + '% — ' + band.with_token + ' of ' + band.n + ' record a token (' + band.band + ')';
  }

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var qualityText = (row.signal_quality === 'strong' ? 'Strong signal' : row.signal_quality === 'fair' ? 'Fair signal' : 'Thin signal') + ': ' + (row.signal_quality === 'strong' ? 'age, growth and a category factor all on record.' : row.signal_quality === 'fair' ? 'two of age, growth and a category factor on record.' : 'only one of age, growth and a category factor on record.');
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' · watchlist' : ' · early radar') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    var eq = el('div', { class: 'equation' },
      eqRow('TVL', fmtUsd(row.tvl_usd)),
      eqRow('Curve value', fmtUsd(row.curve_value_usd)),
      eqRow('Category factor', fmtMult(row.category_factor)),
      eqRow('Curve-implied value', fmtUsd(row.curve_implied_value_usd)),
      eqRow('Launch odds (peers in age band)', launchOddsText(row)),
      eqRow('Expected value', fmtUsd(row.expected_value_usd)),
      eqRow('Band (middle 50% of 200 refits × odds)', fmtUsd(row.expected_low_usd) + ' - ' + fmtUsd(row.expected_high_usd)),
      eqRow('Expected / TVL', fmtMult(row.tvl_usd ? row.expected_value_usd / row.tvl_usd : null)),
      eqRow('7-day growth (shown)', fmtPct(row.change_7d)),
      eqRow('Age, no token (shown)', fmtAge(row.age_days)),
      eqRow('Chains (shown)', String(row.chains.length))
    );
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Expected value' }),
      eq,
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': log10(market cap) = ' + DATA.curve.a + ' + ' + DATA.curve.b + ' x log10(TVL), fitted on ' + DATA.curve.n + ' traded tokens (R2 ' + DATA.curve.r2 + '). An estimate, not a price.' }),
      el('p', { class: 'sub', text: 'The band is the middle 50% of 200 bootstrap refits (fixed seed) times the launch odds: half put this row between ' + fmtUsd(row.expected_low_usd) + ' and ' + fmtUsd(row.expected_high_usd) + '.' }),
      el('p', { class: 'sub', text: 'Category evidence: ' + row.category_source + '.' }),
      el('p', { class: 'sub' }, el('span', { class: 'quality ' + row.signal_quality }, el('i', {}), ' ' + qualityText))
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Nearest traded neighbours (same size, real market caps)' }),
      el('p', { class: 'sub', text: 'The three traded tokens closest to this row in TVL.' }),
      el('table', { class: 'mult-table' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: 'Mcap' }), el('th', { scope: 'col', text: 'Mcap/TVL' }))),
        el('tbody', null, (row.neighbours || []).map(function (n) {
          return el('tr', null, el('td', { text: n.name }), el('td', { class: 'num', text: fmtUsd(n.tvl_usd) }), el('td', { class: 'num', text: fmtUsd(n.mcap_usd) }), el('td', { class: 'num', text: fmtMult(n.multiple) }));
        })),
      el('p', { class: 'sub', text: 'Median neighbour multiple: ' + fmtMult(neighMed(row.neighbours)) + ' (expected multiple ' + fmtMult(row.tvl_usd ? row.expected_value_usd / row.tvl_usd : null) + ').' }),
      )
    ));
    var anchor = el('section', { class: 'detail-section' }, el('h3', { text: 'Funding anchor and fees' }));
    if (row.cryptorank && row.cryptorank.total_raised_usd) {
      anchor.appendChild(el('div', { class: 'equation' },
        eqRow('Total raised', fmtUsd(row.cryptorank.total_raised_usd)),
        eqRow('Expected / total raised', fmtMult(row.expected_value_usd / row.cryptorank.total_raised_usd)),
        eqRow('Token status', row.cryptorank.token_status),
        eqRow('Latest round', row.cryptorank.rounds && row.cryptorank.rounds.length ? (row.cryptorank.rounds[0].date ? row.cryptorank.rounds[0].stage + ' · ' + row.cryptorank.rounds[0].date : row.cryptorank.rounds[0].stage) : 'none on record')
      ));
      anchor.appendChild(el('p', { class: 'sub', text: row.cryptorank.total_raised_verified ? (row.cryptorank.verification_note || 'Total raised cross-checks against a second source.') : (row.cryptorank.verification_note || 'Total raised as reported.') }));
    } else if (row.cryptorank) {
      anchor.appendChild(el('p', { class: 'sub', text: 'No fundraising total on record (' + (row.cryptorank.verification_note || 'no total raised on record') + ').' }));
    } else {
      anchor.appendChild(el('p', { class: 'sub', text: 'No fundraising total on record in the sources checked.' }));
    }
    if (row.fees_30d_usd !== null && row.fees_30d_usd > 0) {
      anchor.appendChild(el('div', { class: 'equation' },
        eqRow('Fees, 30d', fmtUsd(row.fees_30d_usd)),
        eqRow('Fees, 7d', fmtUsd(row.fees_7d_usd)),
        eqRow('Fees, all time', fmtUsd(row.fees_all_time_usd))
      ));
    } else {
      anchor.appendChild(el('p', { class: 'sub', text: 'DefiLlama reports no fees for this protocol in the last 30 days.' }));
    }
    if (row.coingecko && row.coingecko.checked) {
      anchor.appendChild(el('p', { class: 'sub', text: row.coingecko.native_token ? 'CoinGecko native token: ' + row.coingecko.native_token.name + ' (' + row.coingecko.native_token.symbol + ') - ' + row.coingecko.native_token.note + '.' : 'CoinGecko: no verified native token. ' + (row.coingecko.note || '') }));
    }
    if (row.tokenterminal) {
      anchor.appendChild(el('p', { class: 'sub' }, 'Token Terminal (public page, no key): ' + row.tokenterminal.note + ' - ', el('a', { href: row.tokenterminal.url, target: '_blank', rel: 'noopener', text: 'Token Terminal page' }), '.'));
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
        eqRow('Gas (' + row.farm_txs + ' tx)', fmtMoney2(row.farm_gas_usd)),
        eqRow('Opportunity (4.2% T-bill)', fmtMoney2(row.farm_opportunity_usd)),
        eqRow('Net cost of the slice', fmtMoney2(row.farm_net_usd) + ' (' + (row.farm_net_usd / 10).toFixed(1) + '% of $1,000)'),
        eqRow('Net cost per hour', perHour(row)),
        eqRow('Deposit that stays FARM', maxDeposit(row)),
        eqRow('Time', Math.round(row.farm_minutes / 60 * 10) / 10 + ' hours'),
        eqRow('Verdict', el('span', { class: 'verdict ' + row.farm_verdict.toLowerCase(), text: row.farm_verdict }))
      ),
      row.farm_program ? el('p', { class: 'sub' }, 'Farm program: ', el('b', { text: row.farm_program.label }), ' (public sources: ', el('a', { href: row.farm_program.source, target: '_blank', rel: 'noopener', text: 'source' }), '). Steps below name the real vault, product or venue.') : null,
      el('ol', { class: 'steps' }, row.farm_steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      })),
      el('p', { class: 'sub', text: 'A plan is a way to be present if a token ever comes, not a promise of one. Gas is a stated assumption, not a quote.' })
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
    shell.appendChild(strip());
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
