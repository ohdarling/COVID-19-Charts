/* global $ */
/* exported setCurrentLang getCurrentLang getLangProp */

let currentLanguage = 'zh';
if (document.cookie.indexOf('lang=') > -1) {
  currentLanguage = document.cookie.indexOf('lang=en') > -1 ? 'en' : 'zh';
} else {
  currentLanguage = (navigator.language || '').split('-')[0] === 'zh' ? 'zh' : 'en';
}
const langTitleMap = {
  'zh': '中文',
  'en': 'English',
};
$('#langDropdown').html(langTitleMap[currentLanguage]);

function setCurrentLang(lang) {
  document.cookie = `lang=${lang};max-age=31536000`;
  location.reload();
}

const getCurrentLang = () => {
  return currentLanguage;
};

const languageMap = {
  '总体趋势': 'Summary',
  '新增概览': 'Increasements',
  '省市趋势': 'Provinces Trends',
  '省市地图': 'Provinces Map',
  '全部城市地图': 'All Cities Map',
  '世界地图': 'World Map',
  '数据来源': 'Data Source',
  '各国趋势': 'World Trends',
  '最后更新时间：': 'Last Update: ',
  '其他': 'Others',
  '当前显示累计确诊': 'Display Total Confirmed',
  '当前显示现存确诊': 'Display Exists Confirmed',
  '确诊人数：': 'Confirmed: ',
  '治愈人数：': 'Cured: ',
  '死亡人数：': 'Dead: ',
  '新增确诊：': 'New Confirmed: ',
  '暂无数据': 'N/A',
  '治愈': 'Cured',
  '死亡': 'Dead',
  '治疗': 'Treating',
  '新增确诊': 'Confirmed Incr.',
  '无新增确诊天数': 'Zero Incr. Days',
  '治愈/死亡率': 'Cured/Dead Rate',
  '累计死亡率': 'Accum. Dead Rate',
  '累计治愈率': 'Accum. Cured Rate',
  '新增死亡率': '',
  '累计疑似': 'Total Suspected',
  '累计确诊': 'Total Confirmed',
  '当前疑似': 'Exists Suspected',
  '新增疑似': 'Suspected Incr.',
  '疑似确诊比例': 'Suspected Confirmed Rate',
  '疑似检测': 'Suspected Processed',
  '疑似变化': 'Suspected Trend',
  '疑似检测/确诊': 'Suspected Processed',
  '重症率': 'Critical Rate',
  '全国': 'Country',
  '非湖北': 'Excl. Hubei',
  '湖北省': 'Hubei',
  '现存确诊': 'Exists Confirmed',
  '累计重症比例': 'Accum. Critical Rate',
  '累计重症': 'Accum. Critical',
  '新增重症': 'Critical Incr.',
  '新增治愈': 'Cured Incr.',
  '新增死亡': 'Dead Incr.',
  '确诊': 'Confirmed',
  '亚洲': 'Asia',
  '欧洲': 'Europe',
  '北美洲': 'North America',
  '南美洲': 'South America',
  '非洲': 'Africa',
  '大洋洲': 'Oceania',
  '全部国家': 'All Countries',
  '国家或城市': 'Country or city',
  '搜索': 'Search',
  '国家对比': 'Compare Countries',
  '累计确诊 >= 500 国家': 'Confirmed >= 500 Counties',
  '累计确诊人数': 'Total Confirmed Count',
  '现存确诊人数': 'Exists Confirmed Count',
  '新增确诊人数': 'Increased Count',
  '累计死亡人数': 'Total Dead Count',
  '死亡人数': 'Dead Count',
  '中国趋势': 'China Trends',
  '每百万人口确诊人数': 'Confirmed per 1M People',
  '累计确诊：': 'Total Confirmed: ',
  '现存确诊：': 'Exists Confirmed: ',
};

function getTextForKey(k) {
  if (currentLanguage !== 'en') {
    return k;
  }

  return languageMap[k] || k;
}

function getLangProp(obj, { key = 'name', enKey = 'enName' } = {}) {
  return getCurrentLang() === 'zh' ? obj[key] : (obj[enKey] || obj[key]);
}

$('#navbarSupportedContent a').get().forEach(a => {
  a.innerHTML = getTextForKey(a.innerHTML);
});
$('#navbarSupportedContent input').get().forEach(el => {
  el.placeholder = getTextForKey(el.placeholder);
});
$('#navbarSupportedContent button').get().forEach(el => {
  el.innerHTML = getTextForKey(el.innerHTML);
});