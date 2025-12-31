
const BASE_URL = 'https://alphabrate.github.io/dse/chinese/';

export const TOPIC_MAP: Record<string, string> = {
  '山居秋暝': `${BASE_URL}data/shanjuqiuming.json`,
  '月下獨酌': `${BASE_URL}data/yuexiaduzhuo.json`,
  '登樓': `${BASE_URL}data/denglou.json`,
  '念奴嬌・赤壁懷古': `${BASE_URL}data/niannujiao.json`,
  '聲聲慢・秋情': `${BASE_URL}data/shengshengman.json`,
  '青玉案・元夕': `${BASE_URL}data/qingyuan.json`,
  '師說': `${BASE_URL}data/shishuo.json`,
  '岳陽樓記': `${BASE_URL}data/yueyanglouji.json`,
  '始得西山宴遊記': `${BASE_URL}data/shidexishanyanyouji.json`,
  '六國論': `${BASE_URL}data/liuguolun.json`,
  '論仁、論孝、論君子': `${BASE_URL}data/lunyu.json`,
  '魚我所欲也': `${BASE_URL}data/yuwosuoyuye.json`
};

export const SOURCE_MAP: Record<string, string> = {
  '山居秋暝': `${BASE_URL}data/source/shanjuqiuming.json`,
  '月下獨酌': `${BASE_URL}data/source/yuexiaduzhuo.json`,
  '登樓': `${BASE_URL}data/source/denglou.json`,
  '念奴嬌・赤壁懷古': `${BASE_URL}data/source/niannujiao.json`,
  '聲聲慢・秋情': `${BASE_URL}data/source/shengshengman.json`,
  '青玉案・元夕': `${BASE_URL}data/source/qingyuan.json`,
  '師說': `${BASE_URL}data/source/shishuo.json`,
  '岳陽樓記': `${BASE_URL}data/source/yueyanglouji.json`,
  '始得西山宴遊記': `${BASE_URL}data/source/shidexishanyanyouji.json`,
  '六國論': `${BASE_URL}data/source/liuguolun.json`,
  '論仁、論孝、論君子': `${BASE_URL}data/source/lunyu.json`,
  '魚我所欲也': `${BASE_URL}data/source/yuwosuoyuye.json`
};

export const TOPICS = Object.keys(TOPIC_MAP);
