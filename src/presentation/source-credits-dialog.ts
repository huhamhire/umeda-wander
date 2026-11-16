import type {CreditLink,SourceCredit,SourceCredits} from '../infrastructure/source-credits.ts';

/** Native showModal supplies top-layer isolation and makes the rest of the document inert. */
export function bindCreditsDialog(dialog:HTMLDialogElement,trigger:HTMLElement,close:HTMLButtonElement,heading:HTMLElement):void {
  trigger.addEventListener('click',event=>{event.preventDefault();if(!dialog.open){dialog.showModal();heading.focus({preventScroll:true});}});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
  dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();dialog.close();return;}
    if(event.key!=='Tab')return;
    const targets=[...dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select:not([disabled]),[tabindex="0"]')];
    const first=targets[0],last=targets.at(-1),active=dialog.ownerDocument.activeElement;
    if(event.shiftKey&&(active===first||active===heading)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&active===last){event.preventDefault();first?.focus();}
  });
}

export function renderSourceCredits(container:HTMLElement,credits:SourceCredits,download:()=>void):void {
  const doc=container.ownerDocument;
  const paragraph=(parent:HTMLElement,text:string)=>{const p=doc.createElement('p');p.textContent=text;parent.append(p);};
  const anchor=(parent:HTMLElement,link:CreditLink)=>{
    const a=doc.createElement('a');a.textContent=link.label;a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
  };
  const section=(title:string)=>{const s=doc.createElement('section'),h=doc.createElement('h3');h.textContent=title;s.append(h);container.append(s);return s;};
  const entries=(title:string,items:SourceCredit[])=>{
    if(!items.length)return;
    const s=section(title),list=doc.createElement('ul');list.className='credits-list';s.append(list);
    for(const item of items){
      const li=doc.createElement('li'),h=doc.createElement('h4');h.textContent=item.name;li.append(h);list.append(li);
      paragraph(li,item.use);
      if(item.links.length){const links=doc.createElement('div');links.className='credits-links';for(const link of item.links)anchor(links,link);li.append(links);}
      if(item.licence){const p=doc.createElement('p');p.append('许可：');anchor(p,item.licence);li.append(p);}
      if(item.status)paragraph(li,item.status);
      paragraph(li,item.attribution);
      if(item.download==='osm'){
        const button=doc.createElement('button');button.type='button';button.className='credits-download';button.textContent='下载 OSM 衍生数据与重建说明（JSON）';
        button.addEventListener('click',download);li.append(button);
      }
    }
  };
  container.replaceChildren();paragraph(section('项目说明'),credits.description);
  const project=Object.values(credits.project).filter((link):link is CreditLink=>!!link);
  if(project.length){const s=section('项目源码');for(const link of project){const p=doc.createElement('p');anchor(p,link);s.append(p);}}
  entries('数据与素材许可',credits.data);entries('参考资料',credits.references);
}
