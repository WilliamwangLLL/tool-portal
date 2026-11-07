import json,glob
G='geo/'
LIT={
'安徽':'合肥 蚌埠 黄山 滁州','福建':'厦门','甘肃':'兰州 嘉峪关 金昌 白银 武威 张掖 酒泉',
'广东':'广州 深圳 珠海 佛山 惠州 东莞 中山','贵州':'贵阳 遵义','海南':'海口 三亚 琼海 文昌 陵水 保亭',
'河北':'石家庄 唐山 秦皇岛 邯郸 保定 张家口 承德 廊坊 邢台 沧州 衡水','河南':'郑州 洛阳 安阳 鹤壁 新乡 许昌 焦作 三门峡 济源',
'黑龙江':'哈尔滨 大兴安岭','湖北':'武汉','湖南':'长沙 湘潭','吉林':'长春',
'江苏':'南京 无锡 常州 苏州 南通 扬州 镇江 泰州','江西':'南昌 景德镇 上饶',
'辽宁':'沈阳 大连 锦州 营口 阜新 盘锦 铁岭 朝阳 葫芦岛',
'内蒙古':'呼和浩特 包头 乌海 鄂尔多斯 呼伦贝尔 巴彦淖尔 乌兰察布 阿拉善',
'宁夏':'银川 石嘴山 吴忠 中卫','青海':'西宁 海东 海南藏族 海西','山东':'济南 青岛 淄博 枣庄 东营 潍坊 济宁 泰安 临沂',
'山西':'大同 太原 阳泉 长治 晋城 朔州 晋中 运城 忻州 临汾 吕梁','陕西':'西安 咸阳 渭南 榆林 延安','四川':'成都 泸州 德阳 乐山 眉山 宜宾',
'新疆':'乌鲁木齐 克拉玛依 吐鲁番 哈密 昌吉 博尔塔拉 巴音郭楞 阿克苏 克孜勒苏 喀什 和田 伊犁 塔城 阿勒泰 石河子 五家渠 北屯 铁门关 可克达拉 昆玉',
'云南':'昆明 玉溪 丽江 西双版纳 大理','浙江':'杭州 嘉兴 湖州 绍兴 金华 舟山 丽水',
'西藏':'','广西':''}
WHOLE={'北京':1,'天津':1,'上海':1,'重庆':1,'香港':1,'澳门':1,'台湾':0}
def r(c): return [round(c[0],3),round(c[1],3)]
def ring(rg):
  out=[]
  for p in rg:
    q=r(p)
    if not out or out[-1]!=q: out.append(q)
  return out
def area(rg): return sum(rg[i][0]*rg[i+1][1]-rg[i+1][0]*rg[i][1] for i in range(len(rg)-1))
def poly(p):
  out=[]
  for i,x in enumerate(p):
    x=ring(x)
    if len(x)<4: continue
    if x[0]!=x[-1]: x.append(x[0])
    a=area(x)
    if (i==0 and a>0) or (i>0 and a<0): x=x[::-1]
    out.append(x)
  return out
def geom(g):
  if g['type']=='Polygon': return {'type':'Polygon','coordinates':poly(g['coordinates'])}
  if g['type']=='MultiPolygon': return {'type':'MultiPolygon','coordinates':[q for q in (poly(p) for p in g['coordinates']) if q]}
  if g['type']=='MultiLineString': return {'type':'MultiLineString','coordinates':[ring(x) for x in g['coordinates']]}
  return g
short=lambda n:[k for k in list(LIT)+list(WHOLE) if n.startswith(k)][0]
nat=json.load(open(G+'100000_full.json'))
F=[];P=[];jd=None
for f in nat['features']:
  p=f['properties'];ad=str(p['adcode'])
  if ad=='100000_JD': jd=geom(f['geometry']);continue
  ps=short(p['name'])
  P.append({'type':'Feature','properties':{'n':p['name'],'p':ps},'geometry':geom(f['geometry'])})
  if ps in WHOLE:
    F.append({'type':'Feature','properties':{'n':ps,'p':ps,'l':WHOLE[ps],'c':[round(x,3) for x in (p.get('center') or p['centroid'])]},'geometry':geom(f['geometry'])})
  else:
    sub=json.load(open(G+ad+'_full.json'))
    keys=LIT[ps].split()
    for s in sub['features']:
      q=s['properties'];nm=q['name']
      lit=int(any(nm.startswith(k) for k in keys))
      F.append({'type':'Feature','properties':{'n':nm,'p':ps,'l':lit,'c':[round(x,3) for x in (q.get('center') or q['centroid'])]},'geometry':geom(s['geometry'])})
# sanity: every key matched exactly once
for ps,ks in LIT.items():
  for k in ks.split():
    m=[f['properties']['n'] for f in F if f['properties']['p']==ps and f['properties']['n'].startswith(k)]
    assert len(m)==1,(ps,k,m)
lit=sum(f['properties']['l'] for f in F)
print('features',len(F),'lit',lit)
json.dump({'cities':{'type':'FeatureCollection','features':F},'provs':{'type':'FeatureCollection','features':P},'jd':jd},open('mapdata.json','w'),ensure_ascii=False,separators=(',',':'))
import os;print(os.path.getsize('mapdata.json'))
