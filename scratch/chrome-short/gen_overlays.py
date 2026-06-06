# -*- coding: utf-8 -*-
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\J\Desktop\EditHyper"
OV = os.path.join(ROOT,"scratch/chrome-short/ov"); os.makedirs(OV, exist_ok=True)
cat = json.load(open(os.path.join(ROOT,"scratch/chrome-short/catalogue_v2.json")))
comps = {c["id"]:c for c in json.load(open(os.path.join(ROOT,"scratch/chrome-short/comps.json")))}
COMPDIR = os.path.join(ROOT,"cards/comps/Topps Chrome Short J1")

W,H = 2160,3840
NAVY=(10,22,40); GOLD=(212,160,23); WHITE=(248,248,248); RED=(230,72,72); GREEN=(64,200,120)
F=lambda p,s: ImageFont.truetype(r"C:\Windows\Fonts\\"+p, s)
black=lambda s:F("ariblk.ttf",s); bold=lambda s:F("arialbd.ttf",s); reg=lambda s:F("arial.ttf",s)

def lsp(draw,xy,text,font,fill,ls=0,anchor="la"):
    x,y=xy
    if ls==0:
        draw.text((x,y),text,font=font,fill=fill,anchor=anchor); return
    for ch in text:
        draw.text((x,y),ch,font=font,fill=fill,anchor="la")
        x+=draw.textlength(ch,font=font)+ls

def rrect(d,box,r,fill):
    d.rounded_rectangle(box,radius=r,fill=fill)

# ---------- build reveal list (comped cards, in time order; Shough split from Warren) ----------
reveals=[]
for s in cat["shots"]:
    if s.get("id"):
        rv={"id":s["id"],"player":s["label"],"price":s["price"],"start":s["start"],"end":s["end"]}
        tu=s.get("twoUp")
        if tu:
            rv["end"]=tu["from"]-0.1            # trim main card panel before two-up
            reveals.append(rv)
            reveals.append({"id":tu["id"],"player":tu["label"],"price":tu["price"],"start":tu["from"],"end":s["end"]})
        else:
            reveals.append(rv)
reveals.sort(key=lambda r:r["start"])
cum=0.0
for r in reveals:
    cum=round(cum+r["price"],2); r["cum"]=cum
TOTAL=cum

# ---------- TOP running-total element (1040x300) ----------
def make_total(cum, idx):
    im=Image.new("RGBA",(1040,300),(0,0,0,0)); d=ImageDraw.Draw(im)
    rrect(d,(0,0,1040,300),34,(NAVY[0],NAVY[1],NAVY[2],235))
    d.rectangle((0,0,20,300),fill=GOLD)
    lsp(d,(70,52),"BOX VALUE",bold(46),GOLD,ls=10)
    d.text((64,112),f"${cum:,.2f}",font=black(140),fill=WHITE)
    im.save(os.path.join(OV,f"total_{idx:02d}.png"))

make_total(0.0,0)
for i,r in enumerate(reveals,1): make_total(r["cum"],i)

# ---------- BOTTOM bar (value + player + eBay proof) 2160x760 ----------
def make_bar(rv, idx):
    im=Image.new("RGBA",(W,760),(0,0,0,0)); d=ImageDraw.Draw(im)
    rrect(d,(70,90,2090,740),40,(NAVY[0],NAVY[1],NAVY[2],232))
    d.rectangle((70,90,98,740),fill=GOLD)  # accent (left, square-ish under rounding)
    rrect(d,(70,90,150,740),40,GOLD); rrect(d,(110,90,150,740),0,(NAVY[0],NAVY[1],NAVY[2],232))
    # left text
    lsp(d,(190,150),"EST. VALUE",bold(48),GOLD,ls=10)
    d.text((184,210),f"${rv['price']:,.2f}",font=black(172),fill=WHITE)
    # player + parallel
    c=comps.get(rv["id"],{})
    name=rv["player"].upper()
    pfont=bold(70)
    while d.textlength(name,font=pfont)>1180 and pfont.size>40:
        pfont=bold(pfont.size-3)
    d.text((190,430),name,font=pfont,fill=WHITE)
    sub=(c.get("parallel","") or "").upper()
    if sub: d.text((192,520),sub,font=bold(46),fill=GOLD)
    # eBay proof on right
    f=c.get("file")
    if f and os.path.exists(os.path.join(COMPDIR,f)):
        ss=Image.open(os.path.join(COMPDIR,f)).convert("RGB")
        innerW=380; sc=innerW/ss.width; innerH=int(ss.height*sc)
        innerH=min(innerH,540); innerW=int(ss.width*(innerH/ss.height))
        ss=ss.resize((innerW,innerH))
        card=Image.new("RGB",(innerW+48,innerH+88),(255,255,255))
        cd=ImageDraw.Draw(card); cd.rectangle((0,0,innerW+48,12),fill=GOLD)
        cd.text((24,30),"EBAY · SOLD",font=bold(34),fill=NAVY)
        card.paste(ss,(24,76))
        px=2090-(innerW+48)-40; py=int(90+(650-(innerH+88))/2)+90
        im.paste(card,(px,py))
    im.save(os.path.join(OV,f"bar_{idx:02d}.png"))

for i,r in enumerate(reveals,1): make_bar(r,i)

# ---------- ROI summary card (full screen) ----------
def make_roi(cost):
    im=Image.new("RGBA",(W,H),(NAVY[0],NAVY[1],NAVY[2],255)); d=ImageDraw.Draw(im)
    for y in range(H):  # subtle vertical gradient
        t=y/H; c=(int(8+10*t),int(18+16*t),int(34+24*t))
        d.line((0,y,W,y),fill=c)
    d.rectangle((0,0,W,16),fill=GOLD); d.rectangle((0,H-16,W,H),fill=GOLD)
    cx=W//2
    d.text((cx,560),"TOPPS CHROME",font=black(150),fill=WHITE,anchor="ma")
    d.text((cx,740),"MEGA BOX",font=black(150),fill=GOLD,anchor="ma")
    lsp(d,(cx,1000),"THE BREAKDOWN",bold(64),(180,190,210),ls=14,anchor="ma")
    def row(y,label,val,vcol):
        d.text((300,y),label,font=bold(86),fill=(190,200,215))
        d.text((W-300,y),val,font=black(96),fill=vcol,anchor="ra")
    row(1500,"BOX COST",f"${cost:,.2f}",WHITE)
    d.line((300,1700,W-300,1700),fill=(60,72,96),width=4)
    row(1820,"CARDS VALUE",f"${TOTAL:,.2f}",GREEN if TOTAL>=cost else WHITE)
    d.line((300,2020,W-300,2020),fill=(60,72,96),width=4)
    profit=TOTAL-cost; roi=profit/cost*100
    pcol=GREEN if profit>=0 else RED
    row(2140,"PROFIT/LOSS",f"{'+' if profit>=0 else '-'}${abs(profit):,.2f}",pcol)
    # big ROI
    d.text((cx,2560),"RETURN ON INVESTMENT",font=bold(70),fill=(180,190,210),anchor="ma")
    d.text((cx,2680),f"{roi:+.1f}%",font=black(360),fill=pcol,anchor="ma")
    d.text((cx,3180),f"{TOTAL/cost*100:.0f}% of cost recouped",font=bold(60),fill=(170,180,200),anchor="ma")
    im.save(os.path.join(OV,"roi.png"))

COST=69.99
make_roi(COST)

json.dump({"reveals":reveals,"total":TOTAL,"cost":COST,
           "roi":round((TOTAL-COST)/COST*100,1)},
          open(os.path.join(OV,"manifest.json"),"w"),indent=1)
print(f"reveals={len(reveals)} total=${TOTAL:.2f} cost=${COST} roi={(TOTAL-COST)/COST*100:.1f}%")
print("generated:", len(os.listdir(OV)),"files in",OV)
