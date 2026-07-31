# -*- coding: utf-8 -*-
"""Generator biểu đồ use case (UML) ra draw.io XML, style khớp TownHub_SoDo.drawio."""
import html

S_PKG   = "rounded=0;whiteSpace=wrap;html=1;fillColor=#eef4fc;strokeColor=#6c8ebf;dashed=1;verticalAlign=top;fontSize=12;fontStyle=2;fontColor=#3b5b8c;"
S_PKG2  = "rounded=0;whiteSpace=wrap;html=1;fillColor=#f6f6f6;strokeColor=#999999;dashed=1;verticalAlign=top;fontSize=12;fontStyle=2;fontColor=#555555;"
S_UC    = "ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#dae8fc;strokeColor=#6c8ebf;"
S_UC2   = "ellipse;whiteSpace=wrap;html=1;fontSize=10;fillColor=#eef7ee;strokeColor=#82b366;"  # sub uc (include/extend target)
S_ACTOR = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=12;"
S_ASSOC = "endArrow=none;html=1;strokeColor=#000000;rounded=0;edgeStyle=none;"
S_INC   = "endArrow=open;endFill=0;dashed=1;html=1;strokeColor=#6c8ebf;fontSize=9;fontStyle=2;fontColor=#3b5b8c;endSize=8;"
S_EXT   = "endArrow=open;endFill=0;dashed=1;html=1;strokeColor=#b85450;fontSize=9;fontStyle=2;fontColor=#b85450;endSize=8;"
S_GEN   = "endArrow=block;endFill=0;html=1;strokeColor=#000000;fontSize=9;fontStyle=2;fontColor=#555555;"

def esc(s): return html.escape(s, quote=True)

class Diagram:
    def __init__(self, name):
        self.name=name; self.nid=0; self.pkgs=[]; self.nodes=[]; self.edges=[]
        self.pos={}
    def _id(self):
        self.nid+=1; return f"n{self.nid}"
    def actor(self, label, x, y):
        i=self._id(); self.pos[i]=(x,y,30,60)
        self.nodes.append(f'<mxCell id="{i}" value="{esc(label)}" style="{S_ACTOR}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="30" height="60" as="geometry"/></mxCell>')
        return i
    def uc(self, label, x, y, w=210, h=46, sub=False):
        i=self._id(); self.pos[i]=(x,y,w,h)
        st=S_UC2 if sub else S_UC
        self.nodes.append(f'<mxCell id="{i}" value="{esc(label)}" style="{st}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return i
    def pkg(self, label, x, y, w, h, alt=False):
        i=self._id()
        st=S_PKG2 if alt else S_PKG
        self.pkgs.append(f'<mxCell id="{i}" value="{esc(label)}" style="{st}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return i
    def _edge(self, a, b, style, label='', pts=None):
        i=self._id()
        if pts:
            arr='<Array as="points">'+''.join(f'<mxPoint x="{x}" y="{y}"/>' for x,y in pts)+'</Array>'
            geo=f'<mxGeometry relative="1" as="geometry">{arr}</mxGeometry>'
        else:
            geo='<mxGeometry relative="1" as="geometry"/>'
        self.edges.append(f'<mxCell id="{i}" value="{esc(label)}" style="{style}" edge="1" parent="1" source="{a}" target="{b}">{geo}</mxCell>')
    def assoc(self, actor, uc, pts=None): self._edge(actor, uc, S_ASSOC, pts=pts)
    def include(self, frm, to): self._edge(frm, to, S_INC, '«include»')
    def extend(self, frm, to): self._edge(frm, to, S_EXT, '«extend»')
    def gen(self, child, parent, label='kế thừa vai trò'): self._edge(child, parent, S_GEN, label)
    def xml(self):
        body="\n".join(self.pkgs+self.nodes+self.edges)
        return (f'<mxfile host="app.diagrams.net">\n<diagram id="d1" name="{esc(self.name)}">\n'
                f'<mxGraphModel dx="800" dy="600" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1100" math="0" shadow="0">\n'
                f'<root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n{body}\n</root>\n</mxGraphModel>\n</diagram>\n</mxfile>\n')

# ---- helper: stack a column of use cases, return list of ids ----
def column(dg, labels, x, top, row=72, w=210, h=46, sub=False):
    ids=[]
    y=top
    for lb in labels:
        ids.append(dg.uc(lb, x, y, w, h, sub=sub)); y+=row
    return ids

def save(dg, path):
    open(path,'w',encoding='utf-8').write(dg.xml())
