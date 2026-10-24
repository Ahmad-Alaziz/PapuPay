import urllib.request, pathlib, json
base=pathlib.Path(__file__).resolve().parents[1]
photos={
 'burger':'photo-1568901346375-23c9450c58cd',
 'ramen':'photo-1569718212165-3a8278d5f624',
 'pizza':'photo-1579751626657-72bc17010498',
 'curry':'photo-1603894584373-5ac82b2ae398',
 'tacos':'photo-1551504734-5ee1c4a1479b',
 'noodles':'photo-1512058564366-18510be2db19',
 'bowl':'photo-1512621776951-a57141f2eefd',
 'fries':'photo-1573080496219-bb080dd4f877',
 'lemonade':'photo-1555949366-819808d99159'
}
for name,id in photos.items():
 url=f'https://images.unsplash.com/{id}?auto=format&fit=crop&w=900&q=85'
 try:
  urllib.request.urlretrieve(url,base/'apps/web/public/assets'/f'{name}.jpg')
  print(name,'downloaded')
 except Exception as e: print(name,str(e))
(base/'docs/research/demo-photos.json').write_text(json.dumps({'note':'Illustrative Unsplash food photography, not photographs of actual menu items at partner venues. All menu items and prices are fictional demo content.','photos':photos},indent=2))
