import cv2, numpy as np, os, subprocess, tempfile
ROOT=r"C:\Users\J\Desktop\EditHyper"
SRC=os.path.join(ROOT,"cards/sources/chrome/CutdownChromeMegaBox.mp4")
tmp=tempfile.mkdtemp()
def grab(t):
    p=os.path.join(tmp,"f.png")
    subprocess.run(["ffmpeg","-y","-ss",f"{t:.2f}","-i",SRC,"-frames:v","1","-vf","scale=1280:-1",p],
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return cv2.imread(p)   # 1280x720 (1/3 of 4K)
SC=3  # 1280 -> 3840

def detect(img):
    H,W=img.shape[:2]
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    gray=cv2.bilateralFilter(gray,7,50,50)
    edges=cv2.Canny(gray,40,120)
    edges=cv2.dilate(edges,np.ones((5,5),np.uint8),iterations=2)
    edges=cv2.erode(edges,np.ones((3,3),np.uint8),iterations=1)
    cnts,_=cv2.findContours(edges,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    best=None;bestsc=-1
    for c in cnts:
        area=cv2.contourArea(c)
        if area < W*H*0.03 or area> W*H*0.6: continue
        peri=cv2.arcLength(c,True)
        ap=cv2.approxPolyDP(c,0.04*peri,True)
        x,y,w,h=cv2.boundingRect(c)
        ar=w/max(h,1)
        if not (0.5<ar<0.95): continue          # portrait card
        rect=area/float(w*h)                      # rectangularity
        if rect<0.7: continue
        cx,cy=x+w/2,y+h/2
        centr=1-abs(cx-W*0.5)/(W*0.5)
        score=area*(0.5+0.5*centr)*rect
        if score>bestsc: bestsc=score; best=(x,y,w,h,cx,cy)
    return best

tests=[("tillman",7.37),("surtain",12.14),("breece",14.84),("barkley",30.5),("pacheco",82.9),("judkins",130.0)]
os.makedirs(os.path.join(ROOT,"scratch/chrome-short/rect"),exist_ok=True)
out=[]
for name,t in tests:
    img=grab(t); b=detect(img); im=img.copy()
    if b:
        x,y,w,h,cx,cy=b
        cv2.rectangle(im,(x,y),(x+w,y+h),(0,0,255),3)
        cv2.drawMarker(im,(int(cx),int(cy)),(0,255,0),cv2.MARKER_CROSS,40,3)
        out.append((name,round(cx*SC),round(cy*SC)))
    else:
        out.append((name,None,None))
    cv2.line(im,(img.shape[1]//2,0),(img.shape[1]//2,img.shape[0]),(255,0,255),1)
    cv2.imwrite(os.path.join(ROOT,f"scratch/chrome-short/rect/{name}.png"),cv2.resize(im,(360,203)))
print("detected centers (4K):", out)
