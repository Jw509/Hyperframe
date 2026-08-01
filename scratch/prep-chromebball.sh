#!/usr/bin/env bash
# Rename chromebball eBay comp screenshots to slugged filenames, in video order.
# NOTE: capture order == video order EXCEPT Stephon Castle (145546), captured last but
# pulled 4th — he's the money card, the user went back for that comp afterwards.
set -e
cd "$(dirname "$0")/../cards/comps/chromebball"
mv "Screenshot 2026-07-22 143027.png" 01-derrick-jones-jr.png
mv "Screenshot 2026-07-22 143334.png" 02-devin-carter.png
mv "Screenshot 2026-07-22 143359.png" 03-anthony-edwards.png
mv "Screenshot 2026-07-22 145546.png" 04-stephon-castle.png
mv "Screenshot 2026-07-22 143801.png" 05-daron-holmes.png
mv "Screenshot 2026-07-22 143903.png" 06-dwyane-wade.png
mv "Screenshot 2026-07-22 144041.png" 07-russell-westbrook.png
mv "Screenshot 2026-07-22 144111.png" 08-naz-reid.png
mv "Screenshot 2026-07-22 144138.png" 09-ulrich-chomche.png
mv "Screenshot 2026-07-22 144235.png" 10-joel-embiid.png
mv "Screenshot 2026-07-22 144305.png" 11-anton-watson.png
mv "Screenshot 2026-07-22 144342.png" 12-larry-bird.png
mv "Screenshot 2026-07-22 144856.png" 13-jabari-walker-auto.png
mv "Screenshot 2026-07-22 145010.png" 14-johnny-furphy.png
mv "Screenshot 2026-07-22 145052.png" 15-anthony-davis.png
mv "Screenshot 2026-07-22 145121.png" 16-tidjane-salaun.png
mv "Screenshot 2026-07-22 145146.png" 17-vince-carter.png
ls -1
