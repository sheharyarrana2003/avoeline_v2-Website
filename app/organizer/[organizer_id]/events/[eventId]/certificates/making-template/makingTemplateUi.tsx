
'use client'

import { useState } from "react";

export default async function MakingTemplateUi() {

    const template_object = {
        "templateId": "techverse-hackathon-2026",
        "templateName": "TechVerse Hackathon Certificate",
        "canvas": {
            "width": 1200,
            "height": 850,
            "background": "#fdfdfb",
            "showGrid": true
        },
        "elements": [
            {
                "id": "el_1",
                "type": "text",
                "content": "TechVerse Hackathon 2026",
                "x": 421,
                "y": 180,
                "width": 370,
                "height": 60,
                "fontFamily": "Clash Display",
                "fontSize": 36,
                "fontWeight": "bold",
                "align": "center",
                "color": "#111111",
                "editable": true,
                "binding": "eventName"
            },
            {
                "id": "el_2",
                "type": "text",
                "content": "Ali Ahmed Khan",
                "binding": "recipientName",
                "x": 300, "y": 380, "fontSize": 28
            }
        ],
        "blockchain": {
            "enabled": true,
            "network": "Polygon",
            "estimatedGasFee": "0.002"
        },
        "requirements": {
            "minAttendanceRate": 80
        }
    }

    const [selectedId, setselectedId] = useState("");


    function ElementRenderer({ element, isSelected, onSelect }) {
        const style = {
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            fontFamily: element.fontFamily,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            textAlign: element.align,
            color: element.color,
            outline: isSelected ? '1px solid #000' : 'none',
            cursor: 'pointer',
        };

        switch (element.type) {
            case 'text':
                return <div style={{
                    position: 'absolute',
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    fontFamily: element.fontFamily,
                    fontSize: element.fontSize,
                    fontWeight: element.fontWeight,
                    textAlign: element.align,
                    color: element.color,
                    outline: isSelected ? '1px solid #000' : 'none',
                    cursor: 'pointer',
                }} onClick={onSelect}>{element.content}</div>;
            case 'image':
                return <img style={{
                    position: 'absolute',
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    fontFamily: element.fontFamily,
                    fontSize: element.fontSize,
                    fontWeight: element.fontWeight,
                    textAlign: element.align,
                    color: element.color,
                    outline: isSelected ? '1px solid #000' : 'none',
                    cursor: 'pointer',
                }} src={element.src} onClick={onSelect} />;
            default:
                return null;
        }
    }


    return (
        <>
            {/* this is the main big div which is gonna have all the elments inside it  */}
            <div className="canvas" style={{ width: template_object.canvas.width, height: template_object.canvas.height }}>
                {template_object.elements.map(el => (
                    <ElementRenderer
                        key={el.id}
                        element={el}
                        isSelected={el.id === selectedId}
                        onSelect={() => setselectedId(el.id)}
                    />
                ))}
            </div>
        </>
    )
}