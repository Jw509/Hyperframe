import cv2, numpy as np, json, subprocess, os, tempfile

ROOT = r"C:\Users\J\Desktop\EditHyper"
PROXY = os.path.join(ROOT, "scratch/chrome-short/proxy.mp4")
cat = json.load(open(os.path.join(ROOT,"scratch/chrome-short/catalogue.json")))
shots = cat["shots"]
W,H = 960,540          # proxy dims
SC = 4                 # proxy -> 4K

tmp = tempfile.mkdtemp()
def grab(t):
    p = os.path.join(tmp,"f.png")
    subprocess.run(["ffmpeg","-y","-ss",f"{t:.2f}","-i",PROXY,"-frames:v","1",p],
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return cv2.imread(p)

def card_bbox(img, prior_cx):
    if img is None: return None
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mat = cv2.inRange(hsv,(92,45,25),(140,255,255))
    skin = cv2.inRange(hsv,(0,25,55),(26,190,255)) | cv2.inRange(hsv,(158,25,55),(180,190,255))
    # --- hand = biggest skin blob ---
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, np.ones((25,25),np.uint8))
    hn,hlab,hstats,hcent = cv2.connectedComponentsWithStats(skin,8)
    if hn<2: return None
    hi = 1+int(np.argmax(hstats[1:,4]))
    handmask = (hlab==hi).astype(np.uint8)*255
    hand_d = cv2.dilate(handmask, np.ones((45,45),np.uint8))
    hand_cy = hcent[hi][1]
    # --- card foreground ---
    fg = cv2.bitwise_not(mat | skin)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5,5),np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((21,21),np.uint8))
    n,lab,stats,cent = cv2.connectedComponentsWithStats(fg,8)
    best=None; bestscore=-1
    for i in range(1,n):
        x,y,w,h,area = stats[i]
        cx,cy = cent[i]
        if not (W*H*0.02 < area < W*H*0.35): continue
        ar = w/max(h,1)
        if ar > 1.25: continue
        # must be gripped by the hand: blob overlaps the dilated hand mask
        blob = (lab==i)
        if cv2.countNonZero((blob.astype(np.uint8))*( (hand_d>0).astype(np.uint8) )) < area*0.05: continue
        # card sits at/above the hand (not the wrist below)
        if cy > hand_cy + H*0.12: continue
        centrality = 1 - abs(cx - W*0.48)/(W*0.5)
        score = area * (0.55 + 0.45*centrality)
        if score>bestscore: bestscore=score; best=(x,y,w,h,cx,cy,area)
    return best

out=[]
dbgdir=os.path.join(ROOT,"scratch/chrome-short/dbg"); os.makedirs(dbgdir,exist_ok=True)
for idx,s in enumerate(shots):
    a,b = s["start"],s["end"]
    ts = [a+(b-a)*f for f in (0.3,0.5,0.7)] if b-a>0.5 else [(a+b)/2]
    prior_cx = s["cx"]/SC
    cs=[]; mid_img=None; mid_box=None
    for j,t in enumerate(ts):
        img=grab(t); box=card_bbox(img, prior_cx)
        if box: cs.append((box[4],box[5]))
        if j==len(ts)//2: mid_img=img; mid_box=box
    if cs:
        cx=int(np.median([c[0] for c in cs])); cy=int(np.median([c[1] for c in cs]))
        det=True
    else:
        cx=int(s["cx"]/SC); cy=int(s["cy"]/SC); det=False
    out.append({**s,"cx":cx*SC,"cy":cy*SC,"detected":det})
    # debug draw on mid frame
    if mid_img is not None:
        im=mid_img.copy()
        if mid_box: x,y,w,h,bx,by,ar=mid_box; cv2.rectangle(im,(x,y),(x+w,y+h),(0,0,255),2)
        cv2.drawMarker(im,(cx,cy),(0,255,0),cv2.MARKER_CROSS,30,3)
        cv2.putText(im,f"{idx+1}",(6,28),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,255,255),2)
        if not det: cv2.putText(im,"NODET",(6,52),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,0,255),2)
        cv2.imwrite(os.path.join(dbgdir,f"d_{idx+1:02d}.png"),cv2.resize(im,(240,135)))

json.dump({**cat,"shots":out}, open(os.path.join(ROOT,"scratch/chrome-short/catalogue_det.json"),"w"), indent=1)
nd=sum(1 for s in out if not s["detected"])
print(f"detected {len(out)-nd}/{len(out)} shots ; {nd} fell back to estimate")
print("centers:", [(i+1,s['cx'],s['cy'],'D' if s['detected'] else 'E') for i,s in enumerate(out)])
