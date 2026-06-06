import cv2, numpy as np, json, os
ROOT=r"C:\Users\J\Desktop\EditHyper"
PROXY=os.path.join(ROOT,"scratch/chrome-short/proxy.mp4")
cat=json.load(open(os.path.join(ROOT,"scratch/chrome-short/catalogue_v2.json")))
shots=cat["shots"]; W,H=960,540; SC=4; FPS=60

cap=cv2.VideoCapture(PROXY)
NF=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print("proxy frames",NF)

def masks(img):
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    mat=cv2.inRange(hsv,(92,45,25),(140,255,255))
    skin=cv2.inRange(hsv,(0,25,55),(26,190,255))|cv2.inRange(hsv,(158,25,55),(180,190,255))
    return mat,skin

def detect_card(img):
    mat,skin=masks(img)
    skinC=cv2.morphologyEx(skin,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
    hn,hlab,hst,hc=cv2.connectedComponentsWithStats(skinC,8)
    if hn<2: return None
    hi=1+int(np.argmax(hst[1:,4])); hand_d=cv2.dilate((hlab==hi).astype(np.uint8)*255,np.ones((55,55),np.uint8))
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    lap=np.abs(cv2.Laplacian(gray,cv2.CV_32F,ksize=3))
    fg=cv2.bitwise_not(mat|skin)
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    fg=cv2.morphologyEx(fg,cv2.MORPH_CLOSE,np.ones((23,23),np.uint8))
    n,lab,st,ct=cv2.connectedComponentsWithStats(fg,8)
    best=None;bestS=-1
    for i in range(1,n):
        x,y,w,h,area=st[i]; cx,cy=ct[i]
        if not (W*H*0.02<area<W*H*0.42): continue
        if cy<H*0.10: continue
        ar=w/max(h,1)
        if ar>1.35: continue
        blob=(lab==i)
        if cv2.countNonZero(blob.astype(np.uint8)*(hand_d>0).astype(np.uint8))<area*0.04: continue
        sharp=float(lap[blob].mean())
        centr=1-abs(cx-W*0.5)/(W*0.5)
        score=area*(0.4+0.3*centr)+sharp*area*0.02 + w*40   # wide+sharp+central card face
        if score>bestS: bestS=score; best=(int(x),int(y),int(w),int(h))
    return best

# manual init overrides (filled after viewing init sheet): shot_index(1-based)->(x,y,w,h) in proxy px
OVERRIDE={}

def newtracker():
    if hasattr(cv2,"TrackerCSRT_create"): return cv2.TrackerCSRT_create()
    return cv2.legacy.TrackerCSRT_create()

# read all frames once (≈8000 @ 960x540 ~ fits)
frames=[]
while True:
    r,f=cap.read()
    if not r: break
    frames.append(f)
cap.release()
print("loaded",len(frames),"frames")

traj={}   # frame_idx -> (cx4k,cy4k)
inits={}
dbgdir=os.path.join(ROOT,"scratch/chrome-short/initdbg"); os.makedirs(dbgdir,exist_ok=True)
for si,s in enumerate(shots,1):
    f0=max(0,int(s["start"]*FPS)); f1=min(len(frames)-1,int(s["end"]*FPS))
    fm=(f0+f1)//2
    box=OVERRIDE.get(si) or detect_card(frames[fm])
    if box is None: box=(int(s["cx"]/SC)-95,int(s["cy"]/SC)-130,190,260)
    inits[si]={"box":box,"fm":fm,"f0":f0,"f1":f1}
    # debug draw init
    im=frames[fm].copy(); x,y,w,h=box
    cv2.rectangle(im,(x,y),(x+w,y+h),(0,0,255),2)
    cv2.putText(im,str(si),(6,28),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,255,255),2)
    cv2.imwrite(os.path.join(dbgdir,f"i_{si:02d}.png"),cv2.resize(im,(300,169)))
    # track fwd + back
    def run(rng,box):
        tr=newtracker(); tr.init(frames[fm],tuple(box))
        for fi in rng:
            ok,b=tr.update(frames[fi])
            if not ok: break
            bx,by,bw,bh=b; cx=bx+bw/2; cy=by+bh/2
            if cx<0 or cx>W or cy<0 or cy>H: break
            traj[fi]=(cx*SC,cy*SC)
    cx0=box[0]+box[2]/2; cy0=box[1]+box[3]/2; traj[fm]=(cx0*SC,cy0*SC)
    run(range(fm+1,f1+1),box)
    run(range(fm-1,f0-1,-1),box)

json.dump({"traj":{str(k):v for k,v in traj.items()},"inits":{str(k):v for k,v in inits.items()},"fps":FPS},
          open(os.path.join(ROOT,"scratch/chrome-short/track.json"),"w"))
print("tracked frames:",len(traj))
