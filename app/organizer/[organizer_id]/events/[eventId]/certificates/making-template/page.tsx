// {
//   "templateId": "techverse-hackathon-2026",
//   "templateName": "TechVerse Hackathon Certificate",
//   "canvas": {
//     "width": 1200,
//     "height": 850,
//     "background": "#fdfdfb",
//     "showGrid": true
//   },
//   "elements": [
//     {
//       "id": "el_1",
//       "type": "text",
//       "content": "TechVerse Hackathon 2026",
//       "x": 421,
//       "y": 180,
//       "width": 370,
//       "height": 60,
//       "fontFamily": "Clash Display",
//       "fontSize": 36,
//       "fontWeight": "bold",
//       "align": "center",
//       "color": "#111111",
//       "editable": true,
//       "binding": "eventName"
//     },
//     {
//       "id": "el_2",
//       "type": "text",
//       "content": "Ali Ahmed Khan",
//       "binding": "recipientName",
//       "x": 300, "y": 380, "fontSize": 28
//     },
//     {
//       "id": "el_3",
//       "type": "qrcode",
//       "x": 900, "y": 500, "size": 60,
//       "binding": "verificationUrl"
//     }
//   ],
//   "blockchain": {
//     "enabled": true,
//     "network": "Polygon",
//     "estimatedGasFee": "0.002"
//   },
//   "requirements": {
//     "minAttendanceRate": 80
//   }
// }

import MakingTemplateUi from "./makingTemplateUi";


export default async function  MakingTemplate(){
return (
    <>
    <MakingTemplateUi />
    </>
)
}