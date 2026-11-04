// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
import {ASSETS} from './corpus.mjs?v=5';
// Section schema shared by the editor, renderer and portable settings format.
// Plain text only: HTML, scripts and arbitrary asset URLs are never accepted.
export const CONTENT_SECTIONS=[
 {id:'hero',label:'Welcome and meeting information',fields:[
  ['heroTitle','Headline, first line','The Adventure'],['heroAccent','Headline, highlighted line','Starts Here','Never Ends'],
  ['visitButton','Main visit button','Visit our unit'],['learnButton','Learn more button','Learn more'],
  ['whenHeading','Meeting-time heading','When we meet'],['whereHeading','Meeting-place heading','Where to find us'],['meetingButton','Meeting visit button','Arrange your first visit']
 ]},
 {id:'about',label:'What we do',fields:[
  ['aboutLabel','Section label','What we do'],['aboutTitle','Heading','Adventures That Build Character','Adventures That Shape Leaders'],
  ['aboutBody','Introduction','Make memories, learn new skills, and find your place in a den.','Learn by doing, take responsibility, and find your place in a patrol.'],
  ['activity1Title','Activity 1 title','Camping & outdoors','Outdoor adventures'],['activity1Body','Activity 1 description','Hiking, camp cooking, exploring, and time together outside.','Explore the outdoors and build the skills to plan an outing.'],
  ['activity2Title','Activity 2 title','Community service','Patrol leadership'],['activity2Body','Activity 2 description','Practice helping other people through local service projects.','Scouts learn to lead and work together, with adult guidance.'],
  ['activity3Title','Activity 3 title','Pinewood Derby','Community service'],['activity3Body','Activity 3 description','Build, race, and celebrate creativity and teamwork.','Find meaningful ways to help other people.'],
  ['activity4Title','Activity 4 title','Leadership & values','Skills for life'],['activity4Body','Activity 4 description','Grow confidence, friendships, and a habit of doing your best.','Practice cooking, navigation, first aid, and teamwork.']
 ]},
 {id:'family',label:'Family adventure / youth leadership',fields:[
  ['familyLabel','Section label','Family adventure','Youth leadership'],['familyTitle','Heading','Where Families Grow Together','A Youth-Led Adventure'],
  ['familyBody','Description','Cub Scouting brings families together to learn, explore, and serve. Your first visit is a chance to meet people and ask what participation looks like.','Scouts learn to plan, solve problems, and lead their patrols. Adults provide guidance and support while Scouts develop their own skills.'],['familyButton','Visit button','Plan your first visit']
 ]},
 {id:'outdoors',label:'Outdoor adventures',fields:[
  ['outdoorsLabel','Section label','Outdoors'],['outdoorsTitle','Heading','Into the Woods','Into the Backcountry'],['outdoorsBody','Description','Outdoor adventures make room for curiosity, teamwork, and confidence. Ask our adult leaders about the outings on our current calendar and how your family can get involved.'],['outdoorsButton','Calendar button','See what is coming up']
 ]},
 {id:'ranks',label:'Dens / advancement',fields:[
  ['ranksLabel','Section label','Our dens','A trail of discovery'],['ranksTitle','Heading','Find Your Rank','The Trail to Eagle']
 ]},
 {id:'visit',label:'Visiting, joining and costs',fields:[
  ['visitLabel','Section label','Your next step'],['visitTitle','Heading','Come See for Yourself'],['visitBody','Invitation','Meet our families and den leaders, ask questions, and learn what joining involves.','Meet our Scouts and adult leaders, ask questions, and learn what joining involves.'],
  ['step1Title','Step 1 title','Get in touch'],['step1Body','Step 1 description','Arrange a visit with our adult membership contact.'],['step2Title','Step 2 title','Visit a meeting'],['step2Body','Step 2 description','We will explain where to enter and what to bring.'],['step3Title','Step 3 title','Ready to join?'],['step3Body','Step 3 description','Use the unit’s official application route after you have had a chance to ask questions.'],
  ['contactButton','Contact button','Ask about a visit'],['applicationButton','Application button','Official application'],['costsTitle','Costs heading','Costs and participation'],['assistanceBody','Financial assistance / accommodations','Ask privately about financial assistance or accommodations your family needs.']
 ]},
 {id:'families',label:'New families and uniforms',fields:[
  ['familiesLabel','Section label','New families'],['familiesTitle','Heading','Getting Ready for Scouting'],['familiesBody','Introduction','Ask our leaders what your Scout needs before buying a uniform or equipment.'],
  ['uniformSummary','Uniform guide heading','View the Cub Scout patch-placement guide','View your unit’s uniform reference'],['uniformCaption','Uniform guide caption','Cub Scout reference diagram. Follow current official guidance for your Scout’s program and uniform.','Follow current official Scouts BSA guidance for your Scout’s program and uniform.'],['uniformBody','Uniform note','','Use the current Scouts BSA uniform and insignia guidance for the tan shirt.'],['uniformButton','Official guidance button','Official uniform and insignia guidance']
 ]},
 {id:'calendar',label:'Calendar',fields:[
  ['calendarLabel','Section label','Our calendar'],['calendarTitle','Heading','Upcoming Events'],['calendarBody','Calendar description','Use our calendar for current approved public events.'],['calendarEmpty','When no calendar is linked','Contact our adult membership team for current public events and visit dates.'],['calendarButton','Calendar button','Open unit calendar'],['calendarPrivacy','Privacy note','Private family details and member-only plans belong in the unit’s private communication system.']
 ]},
 {id:'contact',label:'Contact and footer',fields:[
  ['contactLabel','Section label','Get in touch'],['contactTitle','Heading','Let’s Talk'],['contactBody','Introduction','A parent or guardian can contact our adult membership team to ask questions or arrange a visit.'],['replyBody','Reply explanation','Your email lets our adult membership team reply.'],['nameLabel','Form name label','Your name'],['emailLabel','Form email label','Your email'],['messageLabel','Form message label','How can we help?'],['sendButton','Send button','Send message'],['formPrivacy','Form privacy note','Keep medical records and other sensitive information out of this form.'],['backupLabel','Backup email label','Prefer email?'],
  ['navAbout','About navigation','About'],['navVisit','Join navigation','Join'],['navFamilies','New-family navigation','New Families'],['navCalendar','Calendar navigation','Calendar'],['navContact','Contact navigation','Contact'],['footerExplore','Footer navigation heading','Explore'],['footerResources','Footer resource heading','Resources'],['footerContact','Footer contact heading','Contact'],['footerMessage','Footer contact link','Send a message'],['footerCouncil','Council link','Our council'],['footerFind','Find Scouting link','Find Scouting']
 ]}
];
export const CONTENT_LIMIT=1200;
export function defaultContent(type){return Object.fromEntries(CONTENT_SECTIONS.flatMap(s=>s.fields.map(([key,,pack,troop])=>[key,type==='troop'?(troop??pack):pack])));}
export function imageSlots(type){
 const troop=type==='troop';
 const strip=troop?['platform/photos/canyon-hike.jpg','platform/photos/sea-kayaking.jpg','platform/photos/campfire-night.jpg','platform/photos/whitewater-rafting.jpg','platform/photos/trail-friends.jpg']:['camping-cookout.jpg','pinewood-derby.jpg','hiking-trail.jpg','ridge-hike.jpg','creek-play.jpg','group-battleship.jpg','lakeside-explore.jpg','christmas-parade.jpg'];
 return [
  ...strip.map((choice,i)=>({id:`strip${i}`,section:'hero',label:`Photo strip ${i+1}`,group:'Photos',choice})),
  {id:'family',section:'family',label:'Section photo',group:'Photos',choice:troop?'platform/photos/giant-sequoia.jpg':'camping-cookout.jpg'},
  {id:'outdoors',section:'outdoors',label:'Section photo',group:'Photos',choice:troop?'platform/photos/sequoia-trail.jpg':'hiking-trail.jpg'},
  {id:'program',section:'families',label:'Program emblem',group:'Scouting emblems',choice:troop?'bsa-fleur-de-lis-color.png':'cub-scouts-logo.png'},
  {id:'uniform',section:'families',label:'Unit uniform reference (optional)',group:'Uniform guides',choice:troop?'':'patch-placement.png'},
  ...ASSETS.filter(a=>a.group==='Rank badges'&&a.unitTypes.includes(type)).map((a,i)=>({id:`rank${i}`,section:'ranks',label:`${a.label} badge`,group:'Rank badges',choice:a.id}))
 ];
}
