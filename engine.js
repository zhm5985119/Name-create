/* 起名测算引擎：八字排盘、五行旺衰、喜用神、康熙笔画、五格剖象、三才研判、选字、音律、避坑、评分评级 */
(function (root) {
  'use strict';
  const WX = ['木', '火', '土', '金', '水'];
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // 我生
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };    // 我克
  const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  const HIDE_W = [1, 0.5, 0.3]; // 藏干：本气、中气、余气
  const TAGS = { D: '品德', H: '聪慧', M: '美好', Y: '文雅', G: '光明', Z: '自然', J: '志向', A: '安宁', F: '福乐', K: '坚毅',
    R: '仁善', N: '诚信', S: '健康', T: '才艺', L: '灵动', O: '豁达', C: '自在', P: '高洁', W: '温润' };
  // 原有十类寓意标签；判断两字是否同类、能否“各取一字”成名时只看这十类，新增的寓意标签只用于“期望寓意”匹配
  const CORE_TAGS = 'DHMYGZJAFK';
  const shengWo = e => WX.find(x => SHENG[x] === e);
  const keWo = e => WX.find(x => KE[x] === e);

  /* ================= 一、八字排盘 ================= */
  const MONTH_LING = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const SEASON = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
  function wangShuai(lingWx) {
    const st = {};
    st[lingWx] = '旺'; st[SHENG[lingWx]] = '相'; st[shengWo(lingWx)] = '休'; st[keWo(lingWx)] = '囚'; st[KE[lingWx]] = '死';
    return st;
  }
  /* 真太阳时：北京时间 → 出生地经度修正 + 均时差；1986–1991 年夏令时先减 1 小时 */
  const DST = { 1986: ['05-04', '09-14'], 1987: ['04-12', '09-13'], 1988: ['04-10', '09-11'], 1989: ['04-16', '09-17'], 1990: ['04-15', '09-16'], 1991: ['04-14', '09-15'] };
  const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  function shichen(h, mi) { return ZHI12[Math.floor(((h * 60 + mi + 60) % 1440) / 120)]; }
  function equationOfTime(y, m, d) { // 均时差（分钟），真太阳时 − 平太阳时
    const n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5);
    const b = 2 * Math.PI * (n - 81) / 364;
    return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  }
  function trueSolar(y, m, d, h, mi, lng) {
    const md = String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const dst = DST[y] && md >= DST[y][0] && md <= DST[y][1] ? -60 : 0;
    const lngMin = lng == null ? 0 : (lng - 120) * 4;
    const eot = lng == null ? 0 : equationOfTime(y, m, d);
    const t = new Date(Date.UTC(y, m - 1, d, h, mi) + Math.round(dst + lngMin + eot) * 6e4);
    const o = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
    const mins = o.h * 60 + o.mi;
    const off = ((mins - 60) % 120 + 120) % 120; // 距上一个时辰交界（奇数整点）的分钟数
    const toEdge = Math.min(off, 120 - off);
    return Object.assign(o, { dst, lngMin, eot, applied: lng != null, before: shichen(h, mi), after: shichen(o.h, o.mi), nearEdge: toEdge <= 10, dayChanged: o.d !== d });
  }
  /* 刑冲合会：天干五合，地支六合、三合（半合）、三会、六冲、相刑、六害 */
  const GAN_HE = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' };
  const ZHI_HE = { 子丑: '土', 寅亥: '木', 卯戌: '火', 辰酉: '金', 巳申: '水', 午未: '火' };
  const SAN_HE = [['申子辰', '水'], ['亥卯未', '木'], ['寅午戌', '火'], ['巳酉丑', '金']];
  const SAN_HUI = [['寅卯辰', '木'], ['巳午未', '火'], ['申酉戌', '金'], ['亥子丑', '水']];
  const CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  const HAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  const XING = [['寅巳申', '无恩之刑'], ['丑戌未', '恃势之刑'], ['子卯', '无礼之刑']];
  const pairKey = (a, b, table) => table[a + b] !== undefined ? a + b : table[b + a] !== undefined ? b + a : null;
  function relations(P, ling) {
    const out = [];
    const nm = i => P[i].name;
    const n = P.length;
    // 天干五合（相邻才论合）
    for (let i = 0; i < n - 1; i++) {
      const k = pairKey(P[i].gan, P[i + 1].gan, GAN_HE);
      if (!k) continue;
      const hua = GAN_HE[k];
      const day = nm(i) === '日' || nm(i + 1) === '日';
      if (!day && ling === hua) out.push({ short: `${nm(i)}干${P[i].gan}与${nm(i + 1)}干${P[i + 1].gan}合化${hua}`, text: `月令${ling}旺，合而化${hua}`, stemScale: [[i, 0], [i + 1, 0]], add: { [hua]: 2 } });
      else out.push({ short: `${nm(i)}干${P[i].gan}与${nm(i + 1)}干${P[i + 1].gan}相合（合${hua}不化）`, text: day ? '日干参与合，日主有所牵绊' : '合而不化，两干力量略减', stemScale: day ? null : [[i, 0.8], [i + 1, 0.8]] });
    }
    const zs = P.map(p => p.zhi);
    // 三会、三合
    SAN_HUI.forEach(([g, e]) => { if ([...g].every(z => zs.includes(z))) out.push({ short: `${g}三会${e}局`, add: { [e]: 2 } }); });
    SAN_HE.forEach(([g, e]) => {
      const has = [...g].filter(z => zs.includes(z));
      if (has.length === 3) out.push({ short: `${g}三合${e}局`, add: { [e]: 1.5 } });
      else if (has.length === 2 && has.includes(g[1])) {
        for (let i = 0; i < n - 1; i++) {
          const pr = [zs[i], zs[i + 1]];
          if (pr[0] !== pr[1] && has.includes(pr[0]) && has.includes(pr[1])) { out.push({ short: `${nm(i)}支${pr[0]}与${nm(i + 1)}支${pr[1]}半合${e}`, add: { [e]: 0.5 } }); break; }
        }
      }
    });
    // 六合、六冲、六害（相邻为主，隔位减半）
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const adj = j - i === 1;
      const hk = pairKey(zs[i], zs[j], ZHI_HE);
      if (hk && adj) out.push({ short: `${nm(i)}支${zs[i]}与${nm(j)}支${zs[j]}六合（合${ZHI_HE[hk]}）`, add: { [ZHI_HE[hk]]: 0.5 } });
      if (CHONG.includes(zs[i] + zs[j]) || CHONG.includes(zs[j] + zs[i])) {
        const f = adj ? 0.75 : 0.9;
        out.push({ short: `${nm(i)}支${zs[i]}与${nm(j)}支${zs[j]}${adj ? '相冲' : '遥冲'}`, scale: [[i, f], [j, f]] });
      }
      if (HAI.includes(zs[i] + zs[j]) || HAI.includes(zs[j] + zs[i])) out.push({ short: `${nm(i)}支${zs[i]}与${nm(j)}支${zs[j]}相害` });
    }
    // 相刑与自刑
    XING.forEach(([g, t]) => { const has = [...g].filter(z => zs.includes(z)); if (has.length >= 2 && (g.length === 2 || has.length === 3)) out.push({ short: `${has.join('')}${t}` }); });
    ['辰', '午', '酉', '亥'].forEach(z => { if (zs.filter(x => x === z).length >= 2) out.push({ short: `${z}${z}自刑` }); });
    return out;
  }
  function bazi(Solar, y, m, d, h, mi, hourKnown, opt) {
    opt = opt || {};
    const solar = Solar.fromYmdHms(y, m, d, hourKnown ? h : 12, hourKnown ? mi : 0, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    ec.setSect(opt.sect === 2 ? 2 : 1);
    const P = [
      ['年', ec.getYear(), ec.getYearHideGan(), ec.getYearShiShenGan(), ec.getYearShiShenZhi(), ec.getYearNaYin(), ec.getYearDiShi()],
      ['月', ec.getMonth(), ec.getMonthHideGan(), ec.getMonthShiShenGan(), ec.getMonthShiShenZhi(), ec.getMonthNaYin(), ec.getMonthDiShi()],
      ['日', ec.getDay(), ec.getDayHideGan(), '日主', ec.getDayShiShenZhi(), ec.getDayNaYin(), ec.getDayDiShi()],
    ];
    if (hourKnown) P.push(['时', ec.getTime(), ec.getTimeHideGan(), ec.getTimeShiShenGan(), ec.getTimeShiShenZhi(), ec.getTimeNaYin(), ec.getTimeDiShi()]);
    const pillars = P.map(([name, gz, hide, ssg, ssz, nayin, dishi]) => ({
      name, gz, gan: gz[0], zhi: gz[1], wx: GAN_WX[gz[0]] + ZHI_WX[gz[1]], ss: ssg, nayin, dishi,
      hide: hide.map((g, i) => ({ g, wx: GAN_WX[g], ss: ssz[i] })),
    }));
    const dayGan = ec.getDayGan();
    const me = GAN_WX[dayGan];
    const yin = shengWo(me), shi = SHENG[me], cai = KE[me], guan = keWo(me);
    const role = { [me]: '比劫', [yin]: '印星', [shi]: '食伤', [cai]: '财星', [guan]: '官杀' };

    // 五行个数；天干、地支（藏干）的力量分开记，便于刑冲合会调整
    const count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const zero = () => ({ 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 });
    const stemP = pillars.map(p => { const c = zero(); if (p.name !== '日') c[GAN_WX[p.gan]] += 1; return c; });
    const branchP = pillars.map(p => { const c = zero(); const k = p.name === '月' ? 2 : 1; p.hide.forEach((h, i) => { c[h.wx] += HIDE_W[i] * k; }); return c; });
    pillars.forEach(p => { count[GAN_WX[p.gan]] += 1; count[ZHI_WX[p.zhi]] += 1; });
    const mz = pillars[1].zhi;
    const ling = MONTH_LING[mz];

    // 刑冲合会
    const rel = relations(pillars, ling);
    rel.forEach(r => {
      if (r.scale) r.scale.forEach(([i, f]) => { WX.forEach(e => { branchP[i][e] *= f; }); });
      if (r.stemScale) r.stemScale.forEach(([i, f]) => { WX.forEach(e => { stemP[i][e] *= f; }); });
    });
    const extra = zero();
    rel.forEach(r => { if (r.add) Object.entries(r.add).forEach(([e, v]) => { extra[e] += v; }); });
    const power = zero();
    WX.forEach(e => { power[e] = stemP.reduce((t, c) => t + c[e], 0) + branchP.reduce((t, c) => t + c[e], 0) + extra[e]; });
    const total = WX.reduce((s, e) => s + power[e], 0);
    const support = power[me] + power[yin];
    const ratio = support / total;

    // 得令、得地、得势
    const ws = wangShuai(ling);
    const deLing = ws[me] === '旺' || ws[me] === '相';
    const roots = pillars.filter(p => p.hide.some(h => h.wx === me)).map(p => p.name + '支' + p.zhi);
    const yinRoots = pillars.filter(p => p.hide.some(h => h.wx === yin)).map(p => p.name + '支' + p.zhi);
    const helpers = pillars.filter(p => p.name !== '日' && (GAN_WX[p.gan] === me || GAN_WX[p.gan] === yin)).map(p => p.name + '干' + p.gan);

    // 格局：先看是否从格，再按扶抑取用
    let strong, xi, ji, geju, xiText;
    const pctOf = v => (v * 100).toFixed(0);
    if (ratio >= 0.8 && power[guan] < 0.5) {
      geju = '从强格（专旺）';
      strong = '身极旺';
      xi = [me, yin].sort((a, b) => power[b] - power[a]);
      ji = [guan, cai];
      xiText = `生扶日主的力量占 ${pctOf(ratio)}%，克制日主的官杀${guan}几乎没有（${power[guan].toFixed(1)}），日主旺极而不可抑，按从强格（专旺格）论：顺其旺势，以${xi.join('、')}为喜用，忌${ji.join('、')}逆其旺气。`;
    } else if (ratio <= 0.2 && !roots.length && power[yin] < 0.5) {
      const S = [shi, cai, guan].sort((a, b) => power[b] - power[a])[0];
      geju = { [shi]: '从儿格', [cai]: '从财格', [guan]: '从杀格' }[S];
      strong = '身极弱';
      xi = S === shi ? [shi, cai] : S === cai ? [cai, shi] : [guan, cai];
      ji = [yin, me];
      xiText = `日主无根、印星无力，生扶的力量只占 ${pctOf(ratio)}%，日主弱极无法自立，按${geju}论：顺从最旺的${role[S]}${S}，以${xi.join('、')}为喜用，忌印星${yin}、比劫${me}来生扶。`;
    } else {
      geju = '普通格局（扶抑）';
      if (ratio >= 0.5) {
        strong = ratio >= 0.6 ? '身强' : '身偏强';
        xi = [shi, cai, guan].sort((a, b) => power[a] - power[b]).slice(0, 2);
        ji = [yin, me].sort((a, b) => power[b] - power[a]);
      } else {
        strong = ratio <= 0.4 ? '身弱' : '身偏弱';
        xi = [yin, me];
        ji = [guan, cai, shi].sort((a, b) => power[b] - power[a]).slice(0, 2);
      }
    }
    const missing = WX.filter(e => count[e] === 0);
    const sorted = WX.slice().sort((a, b) => power[b] - power[a]);

    // 调候：夏月以水润燥，冬月以火暖寒
    const season = SEASON[mz];
    let th = null;
    if (season === '夏' || season === '冬') {
      const need = season === '夏' ? '水' : '火';
      const peak = (season === '夏' && (mz === '午' || mz === '未')) || (season === '冬' && (mz === '子' || mz === '丑'));
      const urgent = power[need] < 1.5;
      th = { wx: need, urgent, text: `生于${season}季${mz}月，${season === '夏' ? '火炎土燥' : '水冷金寒'}，需要${need}来${season === '夏' ? '润燥降温' : '暖局解冻'}${peak ? '（正当寒暑最盛之时）' : ''}。八字中${need}的力量为 ${power[need].toFixed(1)}，${urgent ? '偏少，调候较急' : '尚可，调候不急'}。` };
      if (xi.includes(need)) th.text += `${need}本就是喜用，扶抑与调候一致。`;
      else if (ji.includes(need)) th.text += `但${need}在扶抑上为忌，两者相冲，本工具以扶抑为主，${need}按中性看待。`;
      else if (urgent) { th.text += `取${need}为调候用神，与喜用同样加分。`; th.use = true; }
      else th.text += `${need}可作为辅助，按中性看待。`;
    }

    // 推理文字
    const pct = Math.round(ratio * 100);
    const reasons = [];
    reasons.push(`日主${dayGan}${me}，生于${mz}月（${season}季，月令${ling}旺）。${me}在此月处于「${ws[me]}」，${deLing ? '得令' : '失令'}。`);
    reasons.push(roots.length ? `${roots.join('、')}藏有${me}，日主通根，${roots.length >= 2 ? '根基较稳' : '有根'}，得地。` : `地支中没有藏${me}，日主无根，不得地。`);
    if (yinRoots.length) reasons.push(`${yinRoots.join('、')}藏有印星${yin}，可生扶日主。`);
    reasons.push(helpers.length ? `天干${helpers.join('、')}为${helpers.map(h => role[GAN_WX[h.slice(-1)]]).join('、')}，生扶日主，得势。` : '天干没有比劫或印星透出，不得势。');
    if (rel.length) reasons.push(`刑冲合会：${rel.map(r => r.short).join('；')}。已按此调整五行力量。`);
    reasons.push(`加权计算五行力量（藏干本气 1、中气 0.5、余气 0.3，月令加倍，计入刑冲合会）：生扶日主的${me}、${yin}合计 ${support.toFixed(1)}，克泄耗的${[shi, cai, guan].join('、')}合计 ${(total - support).toFixed(1)}，生扶占 ${pct}%，判为${strong}。`);
    if (!xiText) {
      if (ratio >= 0.5) {
        xiText = `${strong}宜克、泄、耗。${shi}为食伤可泄秀气，${cai}为财星可耗身，${guan}为官杀可制身。三者中${xi[0]}力量最弱（${power[xi[0]].toFixed(1)}）${missing.includes(xi[0]) ? '且八字所缺' : ''}，取为用神；${xi[1]}次之（${power[xi[1]].toFixed(1)}），取为喜神。${ji.join('、')}生扶过旺，为忌。`;
      } else {
        xiText = `${strong}宜生扶。取生身的印星${yin}为用神，同类的比劫${me}为喜神。克泄耗日主的${ji.join('、')}力量偏重，为忌。`;
      }
    }
    const buque = missing.length ? missing.map(w => xi.includes(w) ? `八字缺${w}，${w}正是喜用，取名补${w}一举两得` : `八字缺${w}，但${w}${ji.includes(w) ? '为忌神' : '不在喜用之列'}，不宜强补`).join('；') + '。' : '八字五行俱全，取名以扶喜用为主。';
    const tiaohou = th ? th.text : `生于${season}季，气候不寒不燥，调候不急。`;
    const jq = lunar.getPrevJieQi(true);
    return {
      solar: `${y}年${m}月${d}日` + (hourKnown ? ` ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : '（时辰未知）'),
      lunar: `农历${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` + (hourKnown ? ` ${lunar.getTimeZhi()}时` : ''),
      shengxiao: lunar.getYearShengXiao(),
      jieqi: `${jq.getName()}（${jq.getSolar().toYmdHms().slice(0, 16)}）后`,
      yearZhi: pillars[0].zhi, animal: ZHI_ANIMAL[pillars[0].zhi],
      hourKnown, pillars, dayGan, me, role, count, power, ratio, strong, ws, ling, mz, deLing, roots, helpers,
      missing, xi, ji, sorted, reasons, xiText, buque, tiaohou, th, geju, rel,
    };
  }

  /* ================= 二、五格剖象与三才 ================= */
  const SHULI = [null,
    ['吉', '太极之数，万物开泰，生发无穷'], ['凶', '两仪之数，混沌未定，进退失据'], ['吉', '三才之数，天地人和，进取如意'], ['凶', '四象之数，待于生发，万事需慎'],
    ['吉', '五行之数，循环相生，福禄长寿'], ['吉', '六爻之数，安稳余庆，天德地祥'], ['吉', '七政之数，精悍严谨，刚毅果断'], ['吉', '八卦之数，意志刚健，勤勉发展'],
    ['凶', '大成之数，蕴涵凶险，或成或败'], ['凶', '终结之数，万事终局，充满损耗'], ['吉', '旱苗逢雨，万物更新，稳健着实'], ['凶', '掘井无泉，意志薄弱，家庭寂寞'],
    ['吉', '春日牡丹，才艺多能，智谋奇略'], ['凶', '忍苦劳碌，家缘浅薄，常陷困境'], ['吉', '福寿双全，慈祥有德，众望所归'], ['吉', '厚重之数，贵人相助，安富尊荣'],
    ['吉', '刚强之数，权威刚强，突破万难'], ['吉', '铁镜重磨，有志竟成，权威显达'], ['凶', '风云蔽日，辛苦重来，多有挫折'], ['凶', '屋下藏金，非业破运，灾难重重'],
    ['吉', '明月中天，独立权威，首领之数'], ['凶', '秋草逢霜，困难疾弱，志气不伸'], ['吉', '旭日东升，壮丽之数，名显四方'], ['吉', '掘藏得金，家门余庆，白手成家'],
    ['吉', '荣俊之数，资性英敏，才能奇特'], ['凶', '变怪之数，波澜重叠，英雄之运'], ['半吉', '增长之数，欲望无止，自我强烈'], ['凶', '阔水浮萍，遭难之数，家亲缘薄'],
    ['吉', '智谋之数，财力归集，名闻海内'], ['半吉', '吉凶参半，浮沉不定，得失相伴'], ['吉', '春日花开，智勇得志，统领众人'], ['吉', '宝马金鞍，侥幸多望，贵人得助'],
    ['吉', '旭日升天，鸾凤相会，名闻天下'], ['凶', '破家之数，见识短小，辛苦遭逢'], ['吉', '高楼望月，温和平静，智达通畅'], ['凶', '波澜重叠，侠义薄运，常陷困境'],
    ['吉', '猛虎出林，权威显达，热诚忠信'], ['半吉', '磨铁成针，意志薄弱，宜于技艺'], ['吉', '富贵荣华，财帛丰盈，暗藏险象'], ['凶', '退安之数，谨慎保安，盛衰无常'],
    ['吉', '有德之数，纯阳独秀，德高望重'], ['凶', '寒蝉在柳，博识多能，难以专精'], ['凶', '散财破产，外祥内苦，诸事不遂'], ['凶', '烦闷之数，事与愿违，劳而无功'],
    ['吉', '顺风扬帆，新生泰和，万事如意'], ['凶', '浪里淘金，载宝沉舟，艰难困苦'], ['吉', '点石成金，开花结果，权威进取'], ['吉', '古松立鹤，智谋兼备，德量荣达'],
    ['半吉', '转变之数，吉凶难分，不断辛苦'], ['凶', '小舟入海，一成一败，吉凶参半'], ['半吉', '盛衰交加，波澜重叠，先盛后衰'], ['吉', '卓识达眼，先见之明，能获成功'],
    ['凶', '曲卷难星，外祥内患，先富后贫'], ['凶', '石上栽花，难得有活，忧闷不绝'], ['半吉', '善恶之数，外美内苦，和顺难求'], ['凶', '浪里行舟，历尽艰辛，四周障碍'],
    ['吉', '寒雪青松，坚毅之数，终得享福'], ['半吉', '晚行遇月，先苦后甘，大器晚成'], ['凶', '寒蝉悲风，意志衰退，缺乏忍耐'], ['凶', '争名夺利，黑暗无光，心迷意乱'],
    ['吉', '牡丹芙蓉，名利双收，繁荣富贵'], ['凶', '衰败之数，基础虚弱，内外不和'], ['吉', '舟出平海，富贵荣华，身心安泰'], ['凶', '非命之数，骨肉分离，孤独悲愁'],
    ['吉', '巨流归海，富贵长寿，家运隆昌'], ['凶', '岩头步马，进退维谷，艰难不堪'], ['吉', '顺风通达，天赋幸运，事事如意'], ['吉', '顺风吹帆，智虑周密，发明能智'],
    ['凶', '非业之数，坐立不安，处世不顺'], ['凶', '残菊逢霜，寂寞无碍，惨淡忧愁'], ['半吉', '石上金花，内心劳苦，贯彻始终'], ['凶', '劳苦之数，外表吉祥，内含凶兆'],
    ['半吉', '无勇之数，盛衰交加，徒有高志'], ['凶', '残菊经霜，智能无用，辛苦繁多'], ['半吉', '退守之数，保守平安，进则不利'], ['凶', '倾覆离散，骨肉分离，内外不和'],
    ['半吉', '家庭有悦，半吉半凶，能获援护'], ['凶', '祸福参半，先甜后苦，晚景凄凉'], ['凶', '云头望月，身疲力尽，穷迫不伸'], ['凶', '遁吉之数，辛苦不绝，早入隐遁'],
    ['吉', '万物回春，还本归元，吉祥重叠'],
  ];
  const FEMALE_STRONG = [21, 23, 29, 33, 39];
  const GE_MEANING = {
    天格: '祖运，由姓氏决定，代表家世承继，不单独论吉凶',
    人格: '主运，姓名的核心，影响性格、才能和一生的主要运势',
    地格: '前运，影响幼年到青年时期，以及与家人、晚辈的关系',
    外格: '副运，影响社交、人缘和外部助力',
    总格: '后运，影响中年以后到晚年的整体运势',
  };
  function shuli(n, female) {
    const k = ((n - 1) % 80) + 1;
    const [lv, desc] = SHULI[k];
    let level = lv, v = lv === '吉' ? 1 : lv === '半吉' ? 0.6 : 0, note = '';
    if (female && lv === '吉' && FEMALE_STRONG.includes(k)) { level = '半吉'; v = 0.7; note = '传统说法此数刚强，属首领数，女性用之偏刚'; }
    if (k !== n) note = (note ? note + '；' : '') + `超过 81，减 80 按 ${k} 论`;
    return { n, k, level, v, desc, note };
  }
  const numWx = n => ['水', '木', '木', '火', '火', '土', '土', '金', '金', '水'][n % 10];
  const REL1 = { // 天格对人格：成功运
    天生人: [1, '天格生人格，易得长辈、上级提携，成功运顺遂'],
    比和: [0.9, '天格与人格五行相同，上下同心，成功运平稳'],
    人生天: [0.7, '人格生天格，付出多于所得，成功要靠自身努力'],
    人克天: [0.5, '人格克天格，个性强，与长辈、上级易有摩擦'],
    天克人: [0.2, '天格克人格，外部压力大，成功运受阻'],
  };
  const REL2 = { // 人格对地格：基础运
    地生人: [1, '地格生人格，基础稳固，得家人、晚辈助力'],
    比和: [0.9, '人格与地格五行相同，基础平稳安定'],
    人生地: [0.7, '人格生地格，为家人付出较多，基础尚稳'],
    人克地: [0.5, '人格克地格，掌控欲偏强，基础需用心经营'],
    地克人: [0.2, '地格克人格，基础不稳，易有变动'],
  };
  function dir(a, b, A, B) { // a 对 b 的关系
    if (a === b) return '比和';
    if (SHENG[a] === b) return A + '生' + B;
    if (SHENG[b] === a) return B + '生' + A;
    if (KE[a] === b) return A + '克' + B;
    return B + '克' + A;
  }
  function wuge(sur, given, female) {
    const s = sur.map(c => c.kx), g = given.map(c => c.kx);
    const lab = c => `${c.c}${c.kx}`;
    let tian, tianF;
    if (s.length === 1) { tian = s[0] + 1; tianF = `${lab(sur[0])} + 1（单姓加假数 1）`; }
    else { tian = s[0] + s[1]; tianF = `${lab(sur[0])} + ${lab(sur[1])}`; }
    const ren = s[s.length - 1] + g[0];
    const renF = `${lab(sur[sur.length - 1])} + ${lab(given[0])}`;
    let di, diF;
    if (g.length === 1) { di = g[0] + 1; diF = `${lab(given[0])} + 1（单名加假数 1）`; }
    else { di = g[0] + g[1]; diF = `${lab(given[0])} + ${lab(given[1])}`; }
    const zong = s.reduce((a, b) => a + b, 0) + g.reduce((a, b) => a + b, 0);
    const zongF = [...sur, ...given].map(lab).join(' + ');
    let wai, waiF;
    if (s.length === 1 && g.length === 1) { wai = 2; waiF = '单姓单名，外格固定为 2'; }
    else if (s.length === 1) { wai = g[1] + 1; waiF = `${lab(given[1])} + 1（总格 − 人格 + 1）`; }
    else if (g.length === 1) { wai = s[0] + 1; waiF = `${lab(sur[0])} + 1`; }
    else { wai = s[0] + g[1]; waiF = `${lab(sur[0])} + ${lab(given[1])}`; }
    const mk = (n, f, k) => Object.assign(shuli(n, female), { wx: numWx(n), formula: f, meaning: GE_MEANING[k] });
    const ge = { 天格: mk(tian, tianF, '天格'), 人格: mk(ren, renF, '人格'), 地格: mk(di, diF, '地格'), 外格: mk(wai, waiF, '外格'), 总格: mk(zong, zongF, '总格') };
    const wx = [ge.天格.wx, ge.人格.wx, ge.地格.wx];
    const r1 = dir(wx[0], wx[1], '天', '人'), r2 = dir(wx[2], wx[1], '地', '人');
    const k2 = r2 === '比和' ? '比和' : r2;
    const [v1, t1] = REL1[r1], [v2, t2] = REL2[k2];
    const v = (v1 + v2) / 2;
    const level = v >= 0.9 ? '大吉' : v >= 0.75 ? '吉' : v >= 0.5 ? '中平' : '凶';
    const sancai = { wx, r1, r2: k2, t1, t2, v, level };
    const geScore = ge.人格.v * 0.4 + ge.地格.v * 0.25 + ge.总格.v * 0.25 + ge.外格.v * 0.1;
    const score = geScore * 0.6 + v * 0.4;
    const core = [ge.人格, ge.地格, ge.总格];
    let verdict;
    if (core.every(x => x.v === 1) && ge.外格.v > 0 && v >= 0.75) verdict = '大吉';
    else if (ge.人格.v >= 0.7 && !core.some(x => x.v === 0) && v >= 0.5) verdict = '吉';
    else if (core.some(x => x.v === 0) || v < 0.5) verdict = '欠佳';
    else verdict = '中平';
    return { ge, sancai, score, verdict };
  }
  // 按姓氏筛选吉祥笔画组合。大吉：人格、地格、总格皆吉，外格不凶，三才吉以上；吉：人格吉，地格、总格无凶数，三才不凶
  function bestStrokes(sur, len, female) {
    const out = [];
    const mk = n => ({ c: '', kx: n });
    for (let a = 1; a <= 32; a++) {
      for (let b = len === 1 ? 0 : 1; b <= (len === 1 ? 0 : 32); b++) {
        const given = len === 1 ? [mk(a)] : [mk(a), mk(b)];
        const w = wuge(sur, given, female);
        if (w.verdict === '大吉' || w.verdict === '吉') out.push({ key: len === 1 ? `${a}` : `${a}-${b}`, g: len === 1 ? [a] : [a, b], w });
      }
    }
    return out.sort((x, y) => (y.w.verdict === '大吉') - (x.w.verdict === '大吉') || y.w.score - x.w.score);
  }
  // 放宽：只要求人格、总格不是凶数
  function looseStrokes(sur, len, female) {
    const out = [];
    const mk = n => ({ c: '', kx: n });
    for (let a = 1; a <= 32; a++) {
      for (let b = len === 1 ? 0 : 1; b <= (len === 1 ? 0 : 32); b++) {
        const given = len === 1 ? [mk(a)] : [mk(a), mk(b)];
        const w = wuge(sur, given, female);
        if (w.ge.人格.v > 0 && w.ge.总格.v > 0) out.push({ key: len === 1 ? `${a}` : `${a}-${b}`, g: len === 1 ? [a] : [a, b], w });
      }
    }
    const order = { 大吉: 0, 吉: 1, 中平: 2, 欠佳: 3 };
    return out.sort((x, y) => order[x.w.verdict] - order[y.w.verdict] || y.w.score - x.w.score);
  }

  /* ================= 三、音律 ================= */
  const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
  const PLAIN = { ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e', ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o', ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v', ü: 'v' };
  const plain = py => py.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, c => PLAIN[c]);
  const SPLIT_CACHE = {};
  function split(py) {
    if (SPLIT_CACHE[py]) return SPLIT_CACHE[py];
    const p = plain(py);
    const ini = INITIALS.find(i => p.startsWith(i)) || '';
    let fin = p.slice(ini.length);
    if ((ini === 'j' || ini === 'q' || ini === 'x' || ini === 'y') && fin.startsWith('u')) fin = 'v' + fin.slice(1);
    return (SPLIT_CACHE[py] = { p, ini, fin });
  }
  function yinlv(all) {
    const tones = all.map(c => c.tone);
    const sy = all.map(c => split(c.py));
    const notes = [];
    let s = 1;
    const pz = tones.map(t => (t === 1 || t === 2 ? '平' : '仄'));
    if (new Set(tones).size === 1) { s -= 0.4; notes.push('声调完全相同，读起来平板'); }
    else if (all.length > 2 && new Set(pz).size === 1) { s -= 0.15; notes.push(pz[0] === '平' ? '全是平声，略显平淡' : '全是仄声，读来略急促'); }
    for (let i = 1; i < all.length; i++) {
      const a = sy[i - 1], b = sy[i], x = all[i - 1].c, y = all[i].c;
      if (a.p === b.p && x !== y) { s -= 0.4; notes.push(`「${x}${y}」同音，连读不清`); continue; }
      if (tones[i - 1] === 3 && tones[i] === 3) { s -= 0.15; notes.push(`「${x}${y}」连续上声，会变调`); }
      else if (tones[i - 1] === tones[i] && x !== y) s -= 0.08;
      if (a.ini && a.ini === b.ini && x !== y) { s -= 0.12; notes.push(`「${x}${y}」声母相同（${a.ini}），略拗口`); }
      if (a.fin === b.fin && x !== y) { s -= 0.12; notes.push(`「${x}${y}」韵母相同（${a.fin}），略拗口`); }
      if (/n$|ng$/.test(a.p) && !b.ini && /^[aeo]/.test(b.p)) { s -= 0.08; notes.push(`「${x}${y}」连读易粘连`); }
    }
    const last = tones[tones.length - 1];
    if (last === 1 || last === 2) s += 0.05; else if (last === 3 && all.length > 2) s -= 0.03;
    const pattern = pz.join('');
    if (all.length === 3 && ['平仄平', '仄平平', '平平仄', '仄仄平', '仄平仄'].includes(pattern)) s += 0.05;
    if (!notes.length) notes.push('平仄相间，声调有起伏，读来顺口响亮');
    return { score: Math.max(0, Math.min(1, s)), tones, pattern, notes };
  }

  /* ================= 四、字形 ================= */
  function zixing(sur, given) {
    const all = [...sur, ...given];
    const st = given.map(c => c.stroke);
    let s = 1; const notes = [];
    const sum = all.reduce((a, c) => a + c.stroke, 0);
    if (given.some(c => c.stroke >= 18)) { s -= 0.2; notes.push('有笔画较多的字，书写费时'); }
    if (sum > 40) { s -= 0.15; notes.push(`总笔画 ${sum}，偏多`); }
    if (given.length === 2 && Math.max(...st) - Math.min(...st) > 12) { s -= 0.1; notes.push('两字笔画悬殊，字面轻重不均'); }
    for (let i = 1; i < all.length; i++) if (all[i].rad && all[i].rad === all[i - 1].rad && all[i].c !== all[i - 1].c) { s -= 0.2; notes.push(`「${all[i - 1].c}${all[i].c}」部首相同，字形重复`); }
    if (!notes.length) notes.push('笔画适中，书写方便');
    return { score: Math.max(0, s), sum, notes };
  }

  /* ================= 五、避坑 ================= */
  const BAD = new Set(['sha bi', 'bai chi', 'sha gua', 'ben dan', 'wu chi', 'xia liu', 'bei bi', 'hun dan', 'wang ba', 'gou shi', 'si wang', 'sang ming',
    'bing du', 'du yao', 'ji nv', 'biao zi', 'pi gu', 'fang pi', 'chou chong', 'zao gao', 'ma bi', 'ta ma', 'ni ma', 'wei suo', 'sha zi', 'chi dai',
    'fei wu', 'dou bi', 'yang wei', 'fan jian', 'wu de', 'qin shou', 'fan tong', 'pang guang', 'shi ti', 'tu fei', 'xiao tou', 'pian zi',
    'pi yan', 'gang men', 'zhu tou', 'si ren', 'fei ren', 'qi gai', 'ru tou', 'mei liang', 'ya tou', 'ji ba', 'ri ni', 'cao ni', 'diao si',
    'bi chi', 'shi niao', 'niao bu', 'si gui', 'gui hun', 'kuang quan', 'lang xin', 'lan ren', 'wu neng', 'wu liao', 'tan wu', 'yin dang',
    'jian ren', 'du fu', 'zhu ba', 'gou zi', 'xia jian', 'qiang jian', 'yu chun', 'ben zhu', 'dai zi', 'ba zha', 'mi lu', 'shi bai', 'ku si',
    'ai bing', 'si qu', 'bu xing', 'bei ju', 'can fei', 'chu chou', 'qiong guang', 'shen jing', 'hu li', 'du qi', 'wei sheng', 'zhu yi qun',
    'mo gui', 'sha shou', 'mao ce', 'bian bian', 'la shi', 'ma fan', 'xia zi', 'yao jing', 'tou ke', 'chou nv', 'chao fan', 'fei pang',
    'zhang lang', 'zhang ai', 'zhang zui', 'zhang shi', 'ji ji', 'shi zhen xiang', 'du zi teng', 'mei you', 'wu yong', 'bu hao', 'tai jian', 'jie ba']);
  // 姓和名连读成一个现成的词（单字名最容易出现），意思不好或容易被打趣
  const BAD_WORD = new Set(('张扬 张狂 张罗 张望 张嘴 张口 张贴 张皇 张开 陈旧 陈腐 陈列 陈词 陈年 黄昏 黄牛 黄泉 黄色 黄瓜 黄毛 周末 周折 孙子 ' +
    '马虎 马桶 马屁 马路 马甲 马仔 马脚 胡闹 胡说 胡扯 胡乱 胡来 胡须 胡同 胡椒 胡子 何必 何苦 何况 高傲 高潮 高压 高利 谢绝 谢顶 谢幕 谢罪 唐突 ' +
    '田鼠 余孽 余毒 杜绝 杜撰 任性 任凭 石头 石灰 付出 白痴 白眼 白搭 白费 白骨 白菜 白吃 白干 孟浪 熊包 熊样 毛病 毛躁 毛糙 毛贼 毛衣 ' +
    '牛皮 牛气 王八 钱包 钱财 包子 包袱 苟且 秋裤 安息 文盲 武断 刁难 冷淡 冷漠 冷落 游荡 游手 ' +
    '屈服 屈辱 凌乱 戴孝 包庇 车祸 雷人 段子 尤物 蒙骗 蒙蔽').split(' '));
  const BAD_ABBR = ['SB', 'BT', 'TM', 'NC', 'WC', 'MD', 'JB', 'SX', 'CNM', 'NMD', 'TMD', 'NND', 'SM', 'GD', 'BS', 'PG', 'LJ', 'RZ', 'DS', 'BC', 'SJB', 'MLGB', 'ZZ', 'SBW'];
  const HOT_NAMES = ['一诺', '依诺', '欣怡', '梓涵', '语桐', '欣妍', '可欣', '语汐', '雨桐', '梦瑶', '若汐', '艺涵', '苡沫', '诗涵', '子涵', '梓萱', '紫涵', '雨涵',
    '思涵', '沐汐', '佳怡', '语嫣', '一一', '芷若', '安然', '梓琪', '诗琪', '雨欣', '可馨', '奕辰', '宇轩', '浩宇', '亦辰', '宇辰', '子墨', '宇航', '浩然', '梓豪',
    '亦宸', '沐宸', '沐辰', '一鸣', '皓轩', '俊熙', '梓轩', '睿泽', '思远', '嘉懿', '欣然', '梓萌', '若曦', '晨曦', '欣悦',
    // 公安部 2019–2021 年全国姓名报告、2024 年部分城市公布的新生儿热门名
    '铭泽', '子睿', '子轩', '梓睿', '佳琪', '茗泽', '奕泽', '宇泽', '沐阳', '瑞泽', '璟泽', '星辰', '璟言', '星泽', '珺泽',
    '沐瑶', '沐妍', '汐玥', '亦可', '伊一', '艺可', '乐伊',
    // 2025 年四川、成都、云南、福州、烟台公安部门公布的新生儿热门名（2026 年 1 月发布）
    '锦程', '锦汐', '书瑶', '予安', '昕玥',
    // 2026 年网上流传的新生儿高频名汇总（未见官方发布，仅作避重参考）
    '子萱', '泽宇', '景辰', '奕阳', '睿宸', '天佑', '博文', '文轩', '瑾瑜', '思妍', '若彤', '心怡'];
  // 2025 年多地公布的新生儿最热门用字（不在网红字表里的部分），提示并少量扣分
  const HOT_CHARS = { 锦: '2025 年四川、成都、云南新生儿名字里排前三的“爆款字”', 知: '2025 年成都新生儿高频用字', 乐: '2025 年成都新生儿高频用字' };
  // 近两年在部分城市新生儿中热度明显上升、但尚未算网红的字（只提示，不排除）
  const RISING = new Set('珩洵澈熠璟星安沁淼冉瑞'.split(''));
  // 120 万人名样本的统计（由页面载入 names.json 后设置）
  let NAMES = null;
  function setNames(d) { NAMES = d; }
  function dupInfo(given) {
    const g = given.map(c => c.c).join('');
    const hot = HOT_NAMES.includes(g);
    if (!NAMES) return { g, hot, count: null, level: hot ? '爆款' : '', fem: -1, chars: [] };
    const e = NAMES.names[g] || [0, -1];
    const count = e[0];
    const level = hot ? '爆款' : count >= 60 ? '很常见' : count >= 20 ? '常见' : count >= 5 ? '较少' : count >= 3 ? '少见' : '罕见';
    const chars = given.map(c => { const x = NAMES.chars[c.c]; return { c: c.c, count: x ? x[0] : 0, rank: x ? x[1] : 0, rising: RISING.has(c.c) }; });
    return { g, hot, count, level, fem: e[1], chars, total: NAMES.total, nchars: NAMES.nchars };
  }
  // 近年新生儿名字和言情小说里用得过多的字（网红字）
  const TREND = new Set('梓涵轩汐诺宸沐萱芷若嫣语瑶琪欣馨妍婷薇菲萌茉苡沫柠蔓曦晞璇玥珂钰熙煜朵漪霏雯筱歆栀樱蕾蕊芊苒茜菡蘅婵姗娅媛妤依伊倩琳璐玲珊琼芸诗雅可紫怡悦墨辰宇浩泽睿皓霖铭俊奕逸子一艺桐'.split(''));
  function bikeng(sur, given, ctx) {
    const all = [...sur, ...given];
    const syl = all.map(c => split(c.py).p);
    const warn = [], info = [];
    for (let i = 0; i < syl.length; i++) {
      for (let len = 2; len <= 3 && i + len <= syl.length; len++) {
        const w = syl.slice(i, i + len).join(' ');
        if (BAD.has(w)) warn.push(`「${all.slice(i, i + len).map(c => c.c).join('')}」读音近似不雅词（${w}）`);
      }
    }
    const full = all.map(c => c.c).join(''), sl = sur.length;
    const word = [full.slice(sl - 1, sl + 1), full.slice(sl - 1, sl + 2), full].find(w => BAD_WORD.has(w));
    if (word) warn.push(`姓和名连读成「${word}」，容易被打趣`);
    const abbr = all.map(c => split(c.py).p[0].toUpperCase()).join('');
    BAD_ABBR.forEach(b => { if (abbr.includes(b)) warn.push(`拼音缩写 ${abbr} 含「${b}」，容易被调侃`); });
    given.forEach(c => { if (c.poly && c.poly.length > 1) info.push(`「${c.c}」是多音字（${c.poly.join(' / ')}），别人可能读错`); });
    given.forEach(c => { if (c.outside && !c.mean) info.push(`「${c.c}」不在精选字库中，请自行确认字义`); });
    // 上户口用字：户籍登记以《通用规范汉字表》（2013，8105 字）为准，表外字可能无法登记
    given.forEach(c => {
      if (c.tgh === 0) warn.push(`「${c.c}」不在《通用规范汉字表》里，上户口可能无法登记，银行、医保等系统也可能打不出来${c.c === '珮' ? '（可改用规范字“佩”）' : ''}`);
      else if (c.gb === false) info.push(`「${c.c}」在《通用规范汉字表》里，可以登记户口；但不在早年的 GB2312 字符集里，极少数老旧系统可能打不出来`);
    });
    const g = given.map(c => c.c).join('');
    let hot = 0;
    const dup = dupInfo(given);
    if (dup.hot) { hot = 2; warn.push(`「${g}」是近年新生儿热门名字，重名较多`); }
    else if (dup.level === '很常见') { hot += 1; info.push(`「${g}」在人名样本中有 ${dup.count} 人使用，很常见`); }
    else if (dup.level === '常见') { hot += 0.5; info.push(`「${g}」在人名样本中有 ${dup.count} 人使用，较常见`); }
    const hc = given.filter(c => HOT_CHARS[c.c]);
    if (hc.length) { hot += hc.length * 0.5; hc.forEach(c => info.push(`「${c.c}」是${HOT_CHARS[c.c]}，重名会变多`)); }
    const rising = given.filter(c => RISING.has(c.c));
    if (rising.length) { hot += rising.length * 0.2; info.push(`「${rising.map(c => c.c).join('、')}」近两年在新生儿名字里热度上升`); }
    const trend = given.filter(c => TREND.has(c.c));
    if (trend.length) { hot += trend.length * 0.5; info.push(`「${trend.map(c => c.c).join('、')}」是近年流行用字，重名多，易显网红`); }
    if (ctx && ctx.female === true && given.some(c => c.sex === 'm')) info.push(`「${given.filter(c => c.sex === 'm').map(c => c.c).join('、')}」常用于男孩名`);
    if (ctx && ctx.female === false && given.some(c => c.sex === 'f')) info.push(`「${given.filter(c => c.sex === 'f').map(c => c.c).join('、')}」常用于女孩名`);
    if (given.length === 2 && given[0].c === given[1].c) info.push('叠字名，亲切可爱，但正式场合略显稚气');
    return { warn, info, abbr, hot, trend: trend.length, dup };
  }

  /* ================= 六、五行补益 ================= */
  function wuxingFit(given, bz) {
    if (!bz) return { score: 0.5, notes: ['未提供出生时间，不计算八字五行'] };
    const notes = []; let s = 0;
    given.forEach(c => {
      if (!c.wx) { s += 0.4; notes.push(`「${c.c}」五行未定`); return; }
      const bu = bz.missing.includes(c.wx) ? `，补八字所缺之${c.wx}` : '';
      if (c.wx === bz.xi[0]) { s += 1; notes.push(`「${c.c}」属${c.wx}，为用神${bu}`); }
      else if (c.wx === bz.xi[1]) { s += bu ? 0.85 : 0.75; notes.push(`「${c.c}」属${c.wx}，为喜神${bu}`); }
      else if (bz.th && bz.th.use && c.wx === bz.th.wx) { s += 0.85; notes.push(`「${c.c}」属${c.wx}，为调候用神${bu}`); }
      else if (bz.ji.includes(c.wx)) { notes.push(`「${c.c}」属${c.wx}，八字中已偏旺，为忌`); }
      else { s += 0.5; notes.push(`「${c.c}」属${c.wx}，不增不减，属中性`); }
    });
    return { score: s / given.length, notes };
  }

  /* 出生时令：名字里有字呼应出生的季节、时辰或节气，另加分（不同生日的名单因此拉开差别） */
  const SL_SEASON = { 春: '春青萌柳桃杏樱棠莺燕苏芳菲茵芊卉蕾苒蓁葳绿暄', 夏: '夏荷莲菡萤栀茉槐蔚茂葵彤',
    秋: '秋桂菊枫露澄爽朗雁穗实梧皎素泠稔', 冬: '冬雪霁梅松柏凛冰煦暖晞' };
  const SL_TIME = { 晨: '晨曦晓旭昕晞朝熹', 昼: '阳昀晴煦昱晟曜', 暮: '夕霞晚岚彤', 夜: '星月辰萤霄汉' };
  const ZHI_TIME = { 子: '夜', 丑: '夜', 寅: '晨', 卯: '晨', 辰: '晨', 巳: '昼', 午: '昼', 未: '昼', 申: '暮', 酉: '暮', 戌: '夜', 亥: '夜' };
  const TIME_WORD = { 晨: '清晨', 昼: '白天', 暮: '傍晚', 夜: '夜里' };
  function shiling(given, bz, note) {
    if (!bz || !bz.pillars) return { adj: 0, notes: [] };
    const season = SEASON[bz.pillars[1].zhi], time = bz.hourKnown ? ZHI_TIME[bz.pillars[3].zhi] : '';
    const jq = (bz.jieqi || '').split('（')[0];
    const notes = [], label = []; let adj = 0;
    if (note && jq && note === jq) { adj += 3; notes.push(`节气名，正合出生的${jq}时节`); label.push('合' + jq); }
    const sc = given.filter(c => SL_SEASON[season].includes(c.c));
    if (sc.length) { adj += 2; notes.push(`「${sc.map(c => c.c).join('')}」应${season}季出生的时令`); label.push(`应${season}令`); }
    const tc = time ? given.filter(c => SL_TIME[time].includes(c.c)) : [];
    if (tc.length) { adj += 2; notes.push(`「${tc.map(c => c.c).join('')}」应${TIME_WORD[time]}出生`); label.push(`应${TIME_WORD[time]}`); }
    return { adj: Math.min(4, adj), notes, label: label.join('·'), season, time };
  }

  /* ================= 七、寓意与风格 ================= */
  const GENERIC = new Set('东西南北春夏秋冬月元子可一之天心亦予如平凡永光山石林竹禾苗朵枝川江海洋学理识言信新斯尚北乔柯楚中本材方立求存维节规程闻'.split(''));
  const FLORAL_EXTRA = new Set('兰桃樱梅柳桂枫棠槿栀莉茉桐杏梨卉'.split(''));
  const isFloral = c => c.rad === 140 || FLORAL_EXTRA.has(c.c);
  /* 按意象给名字归类（一个名字可属多类）：用于结果页“按意象看”的筛选 */
  const THEMES = { cao: '草木', shui: '山水', guang: '日月光华', yu: '玉石', shu: '书卷', an: '温婉安宁', de: '品德志向' };
  const TH_SET = {
    cao: new Set('兰桃樱梅柳桂枫棠槿栀莉茉桐杏梨卉禾苗朵枝叶芽华'),
    shui: new Set('川江河海洋溪泉湖澜汀渚屿洲岫峰岚涧'),
    guang: new Set('星辰云风雪霜霁晴晨曦晓朝夕虹霞光耀辉曜昭明晏昀春夏秋冬岁时序暮宇宙穹霄汉景熙煜炜焕灿烨皓皎彤照熠炯晖'),
    yu: new Set('珠璧琼瑶'),
    shu: new Set('书墨砚诗文词章典籍卷笙琴弦韵音笛箫画歌言'),
    an: new Set('悦怡恬愉静舒柔婉如宁安然'),
  };
  const TH_RAD = { cao: [140, 75, 115, 118], shui: [85, 15, 46], guang: [72, 74, 173, 86], yu: [96, 112], an: [38] };
  function themesOf(given) {
    const t = new Set();
    given.forEach(c => {
      const r = c.rad2 || c.rad, tg = c.tags || '';
      for (const k of ['cao', 'shui', 'guang', 'yu', 'an']) if (TH_RAD[k].includes(r) || TH_SET[k].has(c.c)) t.add(k);
      if (tg.includes('T') || TH_SET.shu.has(c.c)) t.add('shu');
      if (/[AW]/.test(tg)) t.add('an');
      if (/[DRNJKH]/.test(tg)) t.add('de');
    });
    return t;
  }
  function yuyi(given, ctx) {
    let s = 0.6; const notes = [];
    const gen = given.filter(c => GENERIC.has(c.c)).length;
    if (given.length === 2) s -= gen === 2 ? 0.3 : gen === 1 ? 0.1 : 0;
    const want = ctx.tags || [];
    const hit = new Set();
    given.forEach(c => (c.tags || '').split('').forEach(t => { if (want.includes(t)) hit.add(t); }));
    s += want.length ? 0.4 * Math.min(1, hit.size / Math.min(2, want.length)) : 0.2;
    if (ctx.female === true && given.some(c => c.sex === 'm')) s -= 0.35;
    if (ctx.female === false && given.some(c => c.sex === 'f')) s -= 0.35;
    if (given.some(c => !c.mean)) s -= 0.2;
    if (hit.size) notes.push('契合所选寓意：' + [...hit].map(t => TAGS[t]).join('、'));
    return { score: Math.max(0, Math.min(1, s)), notes, hit: hit.size, want: want.length };
  }
  // 清新风格下扣分的字：说教味重的品德字、文言虚字、上一辈常用字
  const STUFFY = new Set(('德恭俭敬慎惟秉懋恪敦允令淑贞孝忠仁义礼廉谦让之兮其乃维斯尔克钦肃穆庄端正方守规范则宪懿粹质祯祺祥福禄寿喜富贵昌盛隆兴旺宝金国建军伟强刚勇卫红芳英秀珍凤桂霞琴梅丽艳娟萍春兰华玉美菊莲香翠彩娥珠环巧' +
    '贤良淑惠慈孟仲伯季士圭璋琮宗祖尊崇训诫勉励').split(''));
  // 动宾结构：动词 + 自然意象，如知夏、闻溪、听澜
  const VERB = new Set('知闻听观见望念思怀予向归栖临映寻遇逐拾溯'.split(''));
  const IMAGE = new Set('夏秋冬溪川山澜雨晴禾舟遥远安意白南北野屿林森木桉樾星辰月云风雪霁岚汀洲渚澈清和宁晚初一鹿乔苇野河汉澄夕朝晓'.split(''));
  const STYLES = {
    qing: { trend: 6, floral2: 6, inner: 0, stuffy: 5, verbImage: 5, label: '清新自然' },
    duan: { trend: 6, floral2: 8, inner: 2, label: '端庄大气' },
    shi: { trend: 2, floral2: 3, inner: 1, label: '古典诗意' },
    any: { trend: 0, floral2: 0, inner: 0, label: '不限' },
  };
  function fengge(given, ctx) {
    const st = STYLES[ctx.style] || STYLES.qing;
    const notes = [];
    let d = 0;
    const trend = given.filter(c => TREND.has(c.c)).length;
    d -= trend * st.trend;
    const floral = given.filter(isFloral).length;
    if (given.length === 2 && floral === 2) { d -= st.floral2; notes.push('两个字都是花草，偏柔美，略显堆砌'); }
    const inner = given.filter(c => /[DHJK]/.test(c.tags || '')).length;
    d += Math.min(2, inner) * st.inner;
    if (inner && st.inner) notes.push('含有品德、才智或志向方面的用字，显得端庄有内涵');
    if (ctx.liked && ctx.liked.length) {
      let bonus = 0; const why = [];
      ctx.liked.forEach(lk => {
        given.forEach((c, i) => {
          if (lk.some(x => x.c === c.c)) { bonus += 4; why.push(`「${c.c}」与喜欢的名字用字相同`); }
          else if (lk.some(x => x.rad2 && x.rad2 === c.rad2)) { bonus += 1.5; why.push(`「${c.c}」与喜欢的名字偏旁相同`); }
        });
        if (lk.length === given.length && lk.every((x, i) => (x.tone <= 2) === (given[i].tone <= 2))) { bonus += 1.5; why.push('平仄与喜欢的名字一致'); }
      });
      d += Math.min(8, bonus);
      if (why.length) notes.push('风格参考：' + [...new Set(why)].join('；'));
    }
    if (st.stuffy) {
      const old = given.filter(c => STUFFY.has(c.c));
      d -= old.length * st.stuffy + (given.length === 2 && old.length === 2 ? 4 : 0);
      if (old.length) notes.push(`「${old.map(c => c.c).join('、')}」说教味或年代感较重，听起来偏古板`);
      if (given.length === 2 && VERB.has(given[0].c) && IMAGE.has(given[1].c) && given[0].c !== given[1].c) { d += st.verbImage; notes.push('动词加自然意象的结构，灵动有画面感'); }
    }
    return { delta: d, notes };
  }

  /* ================= 口味学习（快速挑名） ================= */
  // taste = { n: 已挑次数, c: {字: [喜欢, 跳过]}, r: {部首: [..]}, t: {平仄: [..]}, k: {类型: [..]} }
  function tasteGroup(kind) { return kind === '典故' || kind === '化用' ? '典故' : kind === '各取' ? '各取' : '其他'; }
  function tasteFeatures(given, group) {
    return { c: given.map(x => x.c), r: given.map(x => String(x.rad2 || x.rad || '')), t: [given.map(x => (x.tone <= 2 ? '平' : '仄')).join('')], k: [group || '其他'] };
  }
  function tasteW(m, key) {
    const v = m && m[key]; if (!v) return 0;
    return (v[0] - 0.35 * v[1]) / (v[0] + v[1] + 1);
  }
  function tasteDelta(given, taste, group) {
    if (!taste || !taste.n || taste.n < 6) return 0;
    const f = tasteFeatures(given, group);
    const avg = (m, keys) => keys.reduce((a, k) => a + tasteW(taste[m], k), 0) / keys.length;
    const d = 5 * avg('c', f.c) + 3 * avg('r', f.r) + 2 * avg('t', f.t) + 1.5 * avg('k', f.k);
    return Math.max(-6, Math.min(6, d));
  }
  function tasteUpdate(taste, given, group, like, undo) {
    taste = taste || { n: 0, c: {}, r: {}, t: {}, k: {} };
    const f = tasteFeatures(given, group), sign = undo ? -1 : 1;
    for (const m of ['c', 'r', 't', 'k']) {
      taste[m] = taste[m] || {};
      f[m].forEach(k => { const v = taste[m][k] || [0, 0]; v[like ? 0 : 1] = Math.max(0, v[like ? 0 : 1] + sign); taste[m][k] = v; });
    }
    taste.n = Math.max(0, (taste.n || 0) + sign);
    return taste;
  }

  /* ================= 八、生肖喜忌 ================= */
  const ZHI_ANIMAL = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
  const SANHE = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
  const LIUHE = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
  const LIUCHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  const LIUHAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  // 代表各地支（生肖）的部首和字形
  const ZHI_SIGN = {
    子: { rads: [39, 208], chars: '子孙学孟季存孜好字享孝孔' }, 丑: { rads: [93], chars: '丑牛' },
    寅: { rads: [141], chars: '寅虎彪' }, 卯: { rads: [], chars: '卯兔卿柳聊昴' },
    辰: { rads: [161, 212], chars: '辰晨宸振震农浓侬唇龙珑泷庞龚宠' }, 巳: { rads: [], chars: '巳起祀熙包苞胞' },
    午: { rads: [187], chars: '午许笃冯' }, 未: { rads: [123], chars: '未妹味昧美善群羡翔详祥洋鲜姜养义羲达' },
    申: { rads: [], chars: '申伸坤绅神珅畅侯' }, 酉: { rads: [164, 196, 172], chars: '酉醇尊遵郑酒鸡' },
    戌: { rads: [94], chars: '戌威然献状伏' }, 亥: { rads: [152], chars: '亥家豪象豫毅孩该核刻' },
  };
  const RAD_NAME = { 140: '艹', 115: '禾', 119: '米', 151: '豆', 199: '麦', 40: '宀', 120: '纟', 145: '衣', 59: '彡', 102: '田', 159: '车',
    30: '口', 116: '穴', 75: '木', 46: '山', 96: '王（玉）', 130: '月（肉）', 61: '心', 72: '日', 74: '月', 85: '氵', 173: '雨', 9: '亻', 149: '讠（言）', 169: '门' };
  const HABIT = { // 依生肖习性的宜忌部首
    子: { like: [119, 115, 151, 199, 40, 30], likeWhy: '鼠喜五谷、有洞可居', dislike: [72], dislikeWhy: '鼠昼伏夜出，忌日' },
    丑: { like: [140, 115, 119, 151, 199, 102], likeWhy: '牛食草谷、有田可耕', dislike: [130], dislikeWhy: '牛为草食，忌肉' },
    寅: { like: [46, 75, 96, 130, 61], likeWhy: '虎居山林、为兽中之王、食肉', dislike: [], dislikeWhy: '' },
    卯: { like: [140, 115, 119, 151, 199, 116, 30], likeWhy: '兔食草谷、有窟可藏', dislike: [130], dislikeWhy: '兔为草食，忌肉' },
    辰: { like: [72, 74, 85, 173, 96], likeWhy: '龙行云雨、飞腾日月、为王者之象', dislike: [], dislikeWhy: '' },
    巳: { like: [30, 40, 116, 75, 140], likeWhy: '蛇喜洞穴、藏身草木', dislike: [], dislikeWhy: '' },
    午: { like: [140, 115, 119, 151, 199, 40, 120, 145, 59], likeWhy: '马食草谷、有厩可栖、披彩饰', dislike: [102, 159], dislikeWhy: '马忌耕田、拉车之劳' },
    未: { like: [140, 115, 119, 151, 199], likeWhy: '羊食草谷', dislike: [130], dislikeWhy: '羊为草食，忌肉' },
    申: { like: [75, 9, 30, 149], likeWhy: '猴居树木、灵巧近人', dislike: [], dislikeWhy: '' },
    酉: { like: [119, 115, 151, 46, 75], likeWhy: '鸡食五谷、栖于山木', dislike: [], dislikeWhy: '' },
    戌: { like: [40, 9, 30, 130, 61], likeWhy: '狗守家、亲人、食肉', dislike: [], dislikeWhy: '' },
    亥: { like: [119, 151, 115, 199, 40], likeWhy: '猪食五谷、有圈可居', dislike: [], dislikeWhy: '' },
  };
  function zodiacInfo(zhi) {
    const sanhe = SANHE.find(g => g.includes(zhi)).replace(zhi, '').split('');
    const liuhe = LIUHE.find(g => g.includes(zhi)).replace(zhi, '');
    const chong = LIUCHONG.find(g => g.includes(zhi)).replace(zhi, '');
    const hai = LIUHAI.find(g => g.includes(zhi)).replace(zhi, '');
    const h = HABIT[zhi];
    return { zhi, animal: ZHI_ANIMAL[zhi], sanhe, liuhe, chong, hai, habit: h,
      likeRads: h.like.map(r => RAD_NAME[r]), dislikeRads: h.dislike.map(r => RAD_NAME[r]) };
  }
  const hasSign = (c, z) => ZHI_SIGN[z].chars.includes(c.c) || ZHI_SIGN[z].rads.includes(c.rad) || ZHI_SIGN[z].rads.includes(c.rad2);
  const hasRad = (c, list) => list.includes(c.rad) || list.includes(c.rad2);
  function zodiacChar(c, zi) {
    const out = [];
    zi.sanhe.forEach(z => { if (hasSign(c, z)) out.push({ d: 0.25, t: `含${ZHI_ANIMAL[z]}（${z}）之形，与${zi.animal}三合`, good: true }); });
    if (hasSign(c, zi.liuhe)) out.push({ d: 0.25, t: `含${ZHI_ANIMAL[zi.liuhe]}（${zi.liuhe}）之形，与${zi.animal}六合`, good: true });
    if (hasSign(c, zi.chong)) out.push({ d: -0.35, t: `含${ZHI_ANIMAL[zi.chong]}（${zi.chong}）之形，${zi.chong}${zi.zhi}相冲`, good: false });
    if (hasSign(c, zi.hai)) out.push({ d: -0.25, t: `含${ZHI_ANIMAL[zi.hai]}（${zi.hai}）之形，${zi.hai}${zi.zhi}相害`, good: false });
    const lk = zi.habit.like.filter(r => hasRad(c, [r]));
    if (lk.length) out.push({ d: 0.15, t: `带「${RAD_NAME[lk[0]]}」，属${zi.animal}所喜（${zi.habit.likeWhy}）`, good: true });
    const dk = zi.habit.dislike.filter(r => hasRad(c, [r]));
    if (dk.length) out.push({ d: -0.2, t: `带「${RAD_NAME[dk[0]]}」，${zi.habit.dislikeWhy}`, good: false });
    return out;
  }
  function shengxiaoFit(given, bz) {
    if (!bz) return { score: 0.6, notes: ['未提供出生时间，不论生肖'], good: 0, bad: 0 };
    const zi = zodiacInfo(bz.yearZhi);
    let d = 0, good = 0, bad = 0; const notes = [];
    given.forEach(c => {
      const hits = zodiacChar(c, zi);
      if (!hits.length) { notes.push(`「${c.c}」与属${zi.animal}无宜忌关系`); return; }
      hits.forEach(h => {
        d += h.d; h.good ? good++ : bad++;
        let t = `「${c.c}」${h.t}`;
        if (!h.good && bz.xi.includes(c.wx)) t += `；但此字属${c.wx}，合八字喜用，以八字为先`;
        notes.push(t);
      });
    });
    return { score: Math.max(0, Math.min(1, 0.6 + d / given.length)), notes, good, bad, animal: zi.animal };
  }

  /* ================= 九、综合评分、等级与点评 ================= */
  const DEFAULT_WEIGHTS = { wuxing: 20, wuge: 10, yinlv: 20, yuyi: 25, chuchu: 15, shengxiao: 5, zixing: 5 };
  function grade(total) {
    if (total >= 90) return { g: '甲', label: '甲等 · 上上' };
    if (total >= 82) return { g: '乙', label: '乙等 · 上' };
    if (total >= 72) return { g: '丙', label: '丙等 · 中上' };
    return { g: '丁', label: '丁等 · 中' };
  }
  function evaluate(sur, given, ctx, poemSrc) {
    const all = [...sur, ...given];
    const r = {
      yinlv: yinlv(all), zixing: zixing(sur, given), wuge: wuge(sur, given, ctx.female === true),
      wuxing: wuxingFit(given, ctx.bazi), yuyi: yuyi(given, ctx), bikeng: bikeng(sur, given, ctx), fengge: fengge(given, ctx),
      shengxiao: shengxiaoFit(given, ctx.bazi),
    };
    const best = poemSrc && poemSrc.length ? poemSrc[0] : null;
    const adj = (poemSrc && poemSrc.adj) || 0;
    // 两字在典籍中相邻出现两次以上视为成词；只在同一句中出现则是“同句取字”，分数较低
    let kind = '', cs = 0;
    if (best) {
      const book = [1, 0.95, 0.85][best.rank];
      let cl = poemSrc.classic || null;
      if (cl && typeof cl === 'object') {
        const sexOk = cl.s === 'n' || ctx.female == null || (cl.s === 'f') === (ctx.female === true);
        cl = sexOk ? cl.k : 0;
        if (cl && (ctx.style || 'qing') === 'qing' && given.some(c => STUFFY.has(c.c))) cl = 0;
      }
      if (cl === 1) { kind = '典故'; cs = 1; }
      else if (cl === 2) { kind = '化用'; cs = 0.9; }
      else if (adj >= 2) { kind = '成词'; cs = 0.45; }
      else if (best.dist === 1) { kind = '相连'; cs = 0.2; }
      else { kind = '同句'; cs = 0.1; }
      cs *= cl ? 1 : book;
    }
    // 各取一字：两个字分别出自典籍中的不同句子，各有寓意；比“碰巧同句”更有分量，但不及典故名
    let each = null;
    if (given.length === 2 && (!kind || kind === '相连' || kind === '同句')) {
      const a = charSources(null, given[0].c), b = charSources(null, given[1].c);
      // 两字要能合成一个意思：动词＋意象、两个意象，或寓意标签相同，才算“各取一字”成名
      const t0 = (given[0].tags || '').replace('X', ''), t1 = (given[1].tags || '').replace('X', '');
      // 只用“好字”：出现在典故名、精选好名里的字，或意象字、动词字；寓意标签只认自然、美好、安宁、文雅、光明几类
      const good = c => GOOD_CHARS.has(c.c) || IMAGE.has(c.c) || VERB.has(c.c);
      const soft = t => 'ZMAYG'.includes(t);
      const fit = good(given[0]) && good(given[1]) && ((VERB.has(given[0].c) && IMAGE.has(given[1].c)) || (IMAGE.has(given[0].c) && IMAGE.has(given[1].c)) || [...t0].some(t => soft(t) && t1.includes(t)));
      if (a.length && b.length && fit) {
        each = [a[0], b[0]];
        kind = '各取';
        cs = 0.5 * ([1, 0.95, 0.85][a[0].rank] + [1, 0.95, 0.85][b[0].rank]) / 2;
      }
    }
    r.chuchu = { score: cs, kind, adj, each };
    if (kind === '典故' || kind === '化用') { r.yuyi.score = Math.min(1, r.yuyi.score + 0.25); r.yuyi.notes.push(kind === '典故' ? '典故名：两字在经典原文中连用，寓意完整' : '化用经典原句，寓意完整'); }
    else if (kind === '成词') { r.yuyi.score = Math.min(1, r.yuyi.score + 0.08); }
    // 组合连贯度：两个字之间要有关联，否则意思散
    if (given.length === 2) {
      const vi = VERB.has(given[0].c) && IMAGE.has(given[1].c);
      const shareTag = (given[0].tags || '').split('').some(t => CORE_TAGS.includes(t) && (given[1].tags || '').includes(t));
      let coh;
      if (kind === '典故' || kind === '化用') coh = 1;
      else if (kind === '成词') coh = 0.85;
      else if (vi) coh = 0.8;
      else if (kind === '相连') coh = 0.45;
      else if (shareTag) coh = 0.5;
      else coh = 0.35;
      if (ctx.curated) coh = Math.max(coh, 0.6);
      r.coherence = coh;
      if (coh < 0.5) { r.yuyi.score = Math.max(0, r.yuyi.score - 0.25); r.yuyi.notes.push('两个字意思上关联不大，组合感偏弱'); }
      else if (coh < 0.6) r.yuyi.score = Math.max(0, r.yuyi.score - 0.1);
    }
    if (ctx.taste && ctx.taste.n >= 6) {
      const td = Math.round(tasteDelta(given, ctx.taste, tasteGroup(kind)) * 10) / 10;
      if (td) {
        r.fengge.delta += td;
        if (td >= 1.5) r.fengge.notes.push('契合你在“快速挑名”里表现出的口味');
        else if (td <= -1.5) r.fengge.notes.push('和你在“快速挑名”里常跳过的名字相似');
      }
      r.taste = td;
    }
    // 选了期望寓意时，契合与否直接加减总分（寓意分常因典故加成封顶，单靠它拉不开差距）
    let tagAdj = 0;
    if (r.yuyi.want) {
      tagAdj = r.yuyi.hit >= Math.min(2, r.yuyi.want) ? 5 : r.yuyi.hit ? 2 : 0;
      if (!r.yuyi.hit) r.yuyi.notes.push('不含所选寓意的字');
    }
    r.tagAdj = tagAdj;
    const sl = ctx.shiling === false ? { adj: 0, notes: [] } : shiling(given, ctx.bazi, ctx.pickNote);
    r.shiling = sl; if (sl.notes.length) r.yuyi.notes.push(...sl.notes);
    const w = ctx.weights || DEFAULT_WEIGHTS;
    const wsum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    let total = 0;
    for (const k of Object.keys(DEFAULT_WEIGHTS)) total += (w[k] || 0) * r[k].score;
    total = total / wsum * 100 + r.fengge.delta + tagAdj + sl.adj;
    total -= r.bikeng.warn.length * 15 + r.bikeng.hot * 3;
    r.total = Math.max(0, Math.min(100, Math.round(total)));
    r.grade = grade(r.total);
    r.verdict = r.wuge.verdict;
    r.comment = comment(sur, given, r, ctx, poemSrc);
    return r;
  }
  function comment(sur, given, r, ctx, src) {
    const name = given.map(c => c.c).join('');
    const parts = [];
    const bz = ctx.bazi;
    if (bz) {
      const fit = given.filter(c => bz.xi.includes(c.wx)), bad = given.filter(c => bz.ji.includes(c.wx));
      const bu = given.filter(c => bz.missing.includes(c.wx) && bz.xi.includes(c.wx));
      if (fit.length === given.length) parts.push(`「${name}」${given.length > 1 ? '两字' : ''}五行为${given.map(c => c.wx).join('、')}，皆合喜用${bu.length ? `，并补八字所缺之${bu[0].wx}` : ''}`);
      else if (fit.length) parts.push(`「${fit.map(c => c.c).join('')}」合喜用${bu.length ? `并补缺${bu[0].wx}` : ''}${bad.length ? `，「${bad.map(c => c.c).join('')}」属${bad.map(c => c.wx).join('')}为忌，五行稍有减分` : ''}`);
      else parts.push(`用字五行${given.map(c => c.wx).join('、')}未合喜用${bad.length ? '，且有忌神之字' : ''}`);
    }
    const g = r.wuge.ge;
    parts.push(`人格${g.人格.n}（${g.人格.desc.slice(0, 4)}，${g.人格.level}）、地格${g.地格.n}（${g.地格.level}）、总格${g.总格.n}（${g.总格.level}）、外格${g.外格.n}（${g.外格.level}）`);
    const sc = r.wuge.sancai;
    parts.push(`三才${sc.wx.join('')}${sc.level}，${sc.t1.split('，')[1] || sc.t1}`);
    if (bz && (r.shengxiao.good || r.shengxiao.bad)) {
      const sx = r.shengxiao;
      parts.push(`生肖属${sx.animal}，用字${sx.good && !sx.bad ? '合生肖所喜' : sx.bad && !sx.good ? '犯生肖所忌，略减分' : '宜忌参半'}`);
    }
    parts.push(`读音${r.yinlv.pattern}，${r.yinlv.notes[0]}`);
    const cut = t => t.length > 18 ? t.slice(0, 18) + '…' : t;
    if (r.chuchu.kind === '各取') parts.push(r.chuchu.each.map(e => `「${e.ch}」取自${e.book}「${cut(e.text)}」`).join('，'));
    else if (src && src.length) parts.push(`${r.chuchu.kind === '典故' ? '典出' : r.chuchu.kind === '化用' ? '化用' : '取字于'}${src[0].book}「${cut(src[0].text)}」`);
    const weak = [];
    if (r.bikeng.warn.length) weak.push(...r.bikeng.warn);
    else if (r.bikeng.info.length) weak.push(r.bikeng.info[0]);
    if (r.fengge.notes[0] && r.fengge.notes[0].startsWith('两个字都是花草')) weak.push('两字皆为花草，偏柔美');
    const verdictText = { 大吉: '数理三才俱佳，综合判为大吉', 吉: '主运吉，综合判为吉', 中平: '数理有半吉之处，综合判为中平', 欠佳: '五格有凶数，综合判为欠佳' }[r.wuge.verdict];
    return parts.join('；') + '。' + verdictText + (weak.length ? `。需留意：${weak.join('；')}。` : '。');
  }

  /* ================= 九、候选生成 ================= */
  function charDist(text, name) {
    if (name.length < 2) return 1;
    let best = 99;
    text.split(/[，、：。！？；,:“”‘’「」『』]/).forEach(cl => {
      const i = cl.indexOf(name[0]);
      if (i < 0) return;
      const j = cl.indexOf(name[1], i + 1);
      if (j > i) best = Math.min(best, j - i);
    });
    return best;
  }
  const RANK0 = new Set(['诗经', '楚辞', '周易', '尚书']);
  const RANK1 = new Set(['论语', '大学', '中庸', '孟子', '礼记', '老子', '庄子', '荀子', '世说新语', '千家诗', '古文观止', '唐诗三百首', '宋词三百首']);
  // 单字出处（“各取一字”）：每个字在诗经楚辞、唐诗宋词等里挑出的句子
  let POEMS_REF = null;
  const GOOD_CHARS = new Set();
  function setPoems(p, data) {
    POEMS_REF = p;
    GOOD_CHARS.clear();
    Object.keys((p && p.classic) || {}).forEach(n => [...n].forEach(c => GOOD_CHARS.add(c)));
    ((data && data.picks) || []).forEach(x => [...x[0]].forEach(c => GOOD_CHARS.add(c)));
  }
  function charSources(poems, ch) {
    poems = poems || POEMS_REF;
    const ids = poems && poems.charSrc && poems.charSrc[ch];
    if (!ids) return [];
    return ids.map(i => {
      const s = poems.sources[i];
      const book = poems.books[s[0]];
      return { book, title: s[1], author: s[2], text: s[3], rank: RANK0.has(book) ? 0 : RANK1.has(book) ? 1 : 2, ch };
    });
  }
  function poemSources(poems, name) {
    const entry = poems && poems.index[name];
    if (!entry) return [];
    const list = entry.slice(1).map(i => {
      const s = poems.sources[i];
      const book = poems.books[s[0]];
      const rank = RANK0.has(book) ? 0 : RANK1.has(book) ? 1 : 2;
      return { book, title: s[1], author: s[2], text: s[3], rank, dist: charDist(s[3], name) };
    }).sort((a, b) => a.rank - b.rank || a.dist - b.dist);
    list.adj = entry[0];
    list.classic = poems.classic ? poems.classic[name] || 0 : 0;
    return list;
  }
  function charPool(data, ctx, opt) {
    const sex = ctx.female === true ? 'f' : ctx.female === false ? 'm' : null;
    const excl = new Set((opt.exclude || '').split('').concat(ctx.surname.chars.map(c => c.c)));
    // 标签含 X 的字只用于参考名单，不参与自动组名
    let pool = data.chars.filter(c => !excl.has(c.c) && !(c.tags || '').includes('X') && (!sex || c.sex === sex || c.sex === 'n'));
    if (!opt.allowTrend) pool = pool.filter(c => !TREND.has(c.c));
    if (ctx.bazi && opt.wxRule === 'strict') pool = pool.filter(c => ctx.bazi.xi.includes(c.wx));
    if (ctx.bazi && opt.wxRule === 'balanced') pool = pool.filter(c => !ctx.bazi.ji.includes(c.wx));
    return pool;
  }
  // 精选好名：用户提供的参考名单 + 同风格新拟。按性别、笔画、五行规则和排除字筛选；网红字不排除，只在评分里扣分
  function genPicks(data, poems, ctx, opt) {
    if (!data.picks) return [];
    const len = opt.len || 2;
    const by = data.byChar || Object.fromEntries(data.chars.map(c => [c.c, c]));
    const sur = ctx.surname.chars;
    const excl = new Set((opt.exclude || '').split(''));
    const xi = ctx.bazi ? ctx.bazi.xi : null, ji = ctx.bazi ? ctx.bazi.ji : null;
    const out = [];
    data.picks.forEach(([name, sex, srcId, hour, mine], i) => {
      if (ctx.female === true && sex === 'm') return;
      if (ctx.female === false && sex === 'f') return;
      if ([...name].length !== len) return;
      const given = [...name].map(c => by[c]);
      if (given.some(c => !c) || given.some(c => excl.has(c.c))) return;
      if (opt.strokeSet && !opt.strokeSet.has(given.map(c => c.kx).join('-'))) return;
      if (xi && opt.wxRule === 'strict' && !given.every(c => xi.includes(c.wx))) return;
      if (xi && opt.wxRule === 'balanced' && (!given.some(c => xi.includes(c.wx)) || given.some(c => ji.includes(c.wx)))) return;
      if (opt.fixed && (len === 1 ? given[0].c !== opt.fixed : given[opt.fixedPos === 2 ? 1 : 0].c !== opt.fixed && !(opt.fixedPos === 0 && given.some(c => c.c === opt.fixed)))) return;
      const src = poemSources(poems, name);
      // 精选名单是人工挑过的组合，不再按“两字关联度”扣分（那条规则是给程序拼字用的）
      const r = evaluate(sur, given, Object.assign({}, ctx, { pickNote: hour, curated: true }), src);
      if (r.bikeng.warn.length && !r.bikeng.dup.hot) return;
      out.push({ name, given, src, r, pick: { src: data.pickSrc[srcId], hour, mine: !!mine }, rank: i });
    });
    out.sort((a, b) => b.r.total - a.r.total || a.rank - b.rank);
    return out;
  }
  function generate(data, poems, ctx, opt) {
    const sur = ctx.surname.chars;
    const pool = charPool(data, ctx, opt);
    const fixed = opt.fixed ? (data.byChar[opt.fixed] || null) : null;
    const strokeOK = opt.strokeSet ? (g => opt.strokeSet.has(g.map(c => c.kx).join('-'))) : () => true;
    const results = [];
    const xi = ctx.bazi ? ctx.bazi.xi : null;
    const push = given => {
      if (!strokeOK(given)) return;
      if (xi && opt.wxRule === 'balanced' && !given.some(c => xi.includes(c.wx))) return;
      const name = given.map(c => c.c).join('');
      const src = poemSources(poems, name);
      if (opt.onlyPoem && !src.length && !(given.length === 2 && given.every(c => charSources(poems, c.c).length))) return;
      const r = evaluate(sur, given, ctx, src);
      if (r.bikeng.warn.length) return;
      results.push({ name, given, src, r });
    };
    if (opt.len === 1) {
      (fixed ? [fixed] : pool).forEach(c => push([c]));
    } else {
      const firsts = fixed && opt.fixedPos !== 2 ? [fixed] : pool;
      const seconds = fixed && opt.fixedPos === 2 ? [fixed] : pool;
      for (const a of firsts) for (const b of seconds) if (a !== b) push([a, b]);
      if (fixed && opt.fixedPos === 0) for (const b of pool) if (b !== fixed) push([b, fixed]);
    }
    results.sort((x, y) => y.r.total - x.r.total || y.src.length - x.src.length);
    const out = [], used = {}, seen = new Set();
    const cap = opt.len === 1 ? 1 : 3;
    for (const it of results) {
      if (seen.has(it.name)) continue;
      if (it.given.some(c => c !== fixed && (used[c.c] || 0) >= cap)) continue;
      it.given.forEach(c => { used[c.c] = (used[c.c] || 0) + 1; });
      seen.add(it.name); out.push(it);
      if (out.length >= (opt.limit || 120)) break;
    }
    return out;
  }

  root.NameEngine = {
    isGoodChar: c => GOOD_CHARS.has(c), themesOf, THEMES, setNames, setPoems, charSources, tasteGroup, tasteDelta, tasteUpdate, tasteW, dupInfo, genPicks, RISING, HOT_NAMES, bazi, trueSolar, shichen, wuge, bestStrokes, looseStrokes, zodiacInfo, zodiacChar, shengxiaoFit, shuli, numWx, yinlv, zixing, bikeng, wuxingFit, yuyi, fengge, evaluate, grade, generate, poemSources, charPool, split,
    TAGS, WX, TREND, STUFFY, STYLES, GE_MEANING, DEFAULT_WEIGHTS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
