import os
import glob
import re
import json
from xml.etree import ElementTree as ET

OEBPS_DIR = '/Users/aego/Desktop/Projectrs/Mousekin/extracted_apk/assets/ePub/OEBPS'
OUTPUT_FILE = '/Users/aego/Desktop/Projectrs/Mousekin/public/book/book_data.json'

def parse_opf():
    opf_file = os.path.join(OEBPS_DIR, 'content.opf')
    with open(opf_file, 'r', encoding='utf-8') as f:
        opf_text = f.read()
    
    # Map item id -> href
    items = re.findall(r'<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"', opf_text)
    items += re.findall(r'<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"', opf_text)
    mapping = {}
    for a, b in items:
        if a.endswith('.mp3') or a.endswith('.png') or a.endswith('.jpg') or a.endswith('.html') or a.endswith('.smil'):
            mapping[b] = a
        else:
            mapping[a] = b
    return mapping

def parse_smil(smil_file, audio_map):
    if not os.path.exists(smil_file):
        return {}
    
    with open(smil_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lang_data = {
        'RU': {'audio': None, 'begin': 0, 'end': 0, 'words': {}},
        'EN': {'audio': None, 'begin': 0, 'end': 0, 'words': {}},
        'DE': {'audio': None, 'begin': 0, 'end': 0, 'words': {}}
    }
    
    # Parse overall audio tracks
    # <par id="0001"><text src="Szene_001#text01RU"></text><audio src="media/Szene_001__text01RU.text.mp3" clipBegin="0s" clipEnd="5.041633s"></audio></par>
    pars = re.findall(r'<par\s+id="([^"]+)">\s*<text\s+src="([^"]+)"></text>\s*<audio\s+src="([^"]+)"\s+clipBegin="([^"]+)"\s+clipEnd="([^"]+)"></audio>\s*</par>', content)
    
    for par_id, text_src, audio_src, clip_b, clip_e in pars:
        clip_b_sec = float(clip_b.rstrip('s'))
        clip_e_sec = float(clip_e.rstrip('s'))
        
        for lang in ['RU', 'EN', 'DE']:
            if lang in text_src or f'_{lang}' in audio_src or f'{lang}.text' in audio_src:
                lang_data[lang]['audio'] = audio_src
                lang_data[lang]['begin'] = clip_b_sec
                lang_data[lang]['end'] = clip_e_sec
                
    # Parse word timings
    # <par id="text01RU_word0"><text src="Szene_001.html#text01RU_word0"></text><audio src="media/Szene_001__text01RU.text.mp3" clipBegin="1.150000" clipEnd="1.250000"></audio></par>
    word_pars = re.findall(r'<par\s+id="([^"]+)">\s*<text\s+src="([^"]+)"></text>\s*<audio\s+src="([^"]+)"\s+clipBegin="([^"]+)"\s+clipEnd="([^"]+)"></audio>', content)
    for par_id, text_src, audio_src, clip_b, clip_e in word_pars:
        if '_word' in par_id:
            clip_b_sec = float(clip_b.rstrip('s'))
            clip_e_sec = float(clip_e.rstrip('s'))
            for lang in ['RU', 'EN', 'DE']:
                if f'{lang}_word' in par_id or f'CRU' in par_id:
                    lang_key = 'RU' if ('RU' in par_id or 'CRU' in par_id) else ('EN' if ('EN' in par_id or 'BEN' in par_id) else 'DE')
                    lang_data[lang_key]['words'][par_id] = {
                        'start': clip_b_sec,
                        'end': clip_e_sec
                    }
                    if not lang_data[lang_key]['audio']:
                        lang_data[lang_key]['audio'] = audio_src
                        
    return lang_data

def parse_html_scene(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        html = f.read()
        
    # Main background image: usually <img src="images/Szene_XX.jpg" alt="" />
    bg_images = re.findall(r'<img\s+src="(images/Szene_\d+\.[a-zA-Z]+)"', html)
    if not bg_images:
        bg_images = re.findall(r'<img\s+src="([^"]+)"', html)
    bg_image = bg_images[-1] if bg_images else ''
    
    # Parse overlays
    # e.g. <div class="overlay..." ... style="..." ...><img ...></div> or </div>
    div_blocks = re.findall(r'(<div\s+class="(?:overlay|text-overlay)[^"]*"[^>]*>.*?</div>)', html, re.DOTALL)
    
    overlays = []
    text_blocks = {'RU': None, 'EN': None, 'DE': None}
    
    for block in div_blocks:
        cls_m = re.search(r'class="([^"]+)"', block)
        classes = cls_m.group(1).split() if cls_m else []
        
        id_m = re.search(r'oskar:id="([^"]+)"', block)
        elem_id = id_m.group(1) if id_m else ''
        
        # Skip watermarks
        if 'Watermark' in elem_id:
            continue
            
        style_m = re.search(r'style="([^"]+)"', block)
        style_str = style_m.group(1) if style_m else ''
        
        # Skip 0-size dummy ambient nodes
        if 'width: 0.000000%' in style_str and 'height: 0.000000%' in style_str:
            continue
            
        # Language detection
        lang = None
        for l in ['RU', 'EN', 'DE']:
            if f'lang{l}' in classes or elem_id.endswith(l) or f'_{l}' in elem_id or f'C{l}' in elem_id:
                lang = l
                break
                
        img_m = re.search(r'<img\s+src="([^"]+)"', block)
        img_src = img_m.group(1) if img_m else None
        
        # Skip dummy uuid images
        if img_src and re.search(r'[0-9a-f]{8}-[0-9a-f]{4}', img_src):
            continue

        is_touch_target = (img_src is None) and ('button' in elem_id.lower() or 'touch' in elem_id.lower())
        
        # Skip hidden animation keyframe clones if not a touch target
        if 'opacity: 0.000000' in style_str and not is_touch_target:
            continue
            
        is_text = 'text-overlay' in classes
        if is_text:
            # Parse words
            word_spans = re.findall(r'<span\s+id="([^"]+)">([^<]+)</span>', block)
            words = [{'id': w_id, 'text': w_txt.strip()} for w_id, w_txt in word_spans]
            full_text = ' '.join([w['text'] for w in words])
            
            # Detect text lang
            text_lang = 'RU' if 'RU' in elem_id or 'langRU' in classes else ('EN' if 'EN' in elem_id or 'langEN' in classes else 'DE')
            text_blocks[text_lang] = {
                'id': elem_id,
                'style': style_str,
                'fullText': full_text,
                'words': words
            }
        else:
            overlays.append({
                'id': elem_id,
                'classes': classes,
                'lang': lang,
                'img': img_src,
                'style': style_str,
                'isTouchTarget': (img_src is None) and ('button' in elem_id.lower() or 'touch' in elem_id.lower())
            })
            
    return bg_image, overlays, text_blocks

def parse_anim_xml(xml_file, audio_map, scene_idx):
    if not os.path.exists(xml_file):
        return None, []
        
    with open(xml_file, 'r', encoding='utf-8') as f:
        xml_text = f.read()
        
    # Ambient sound
    ambient_audio = None
    amb_tag = re.search(r'<animation[^>]+ambient_sound="true"[^>]*>', xml_text)
    if amb_tag:
        snd_m = re.search(r'sound="([^"]+)"', amb_tag.group(0))
        if snd_m and snd_m.group(1) in audio_map:
            ambient_audio = audio_map[snd_m.group(1)]
            
    # Fallback to scene theme in media if ambient_audio is not set
    if not ambient_audio:
        scene_pad = f"{scene_idx:02d}"
        media_dir = os.path.join(OEBPS_DIR, 'media')
        theme_candidates = glob.glob(os.path.join(media_dir, f"Szene_{scene_pad}__*Theme*.mp3")) + \
                           glob.glob(os.path.join(media_dir, f"Szene_{scene_pad}__*.mp3"))
        for cand in theme_candidates:
            bname = os.path.basename(cand)
            if not bname.endswith('.text.mp3') and not 'Narration' in bname:
                ambient_audio = f"media/{bname}"
                break
        
    # Touch triggers
    touch_triggers = []
    anim_blocks = re.findall(r'<animation\s+[^>]*type="touch"[^>]*>', xml_text)
    for block in anim_blocks:
        obj_m = re.search(r'onObject="([^"]+)"', block)
        snd_m = re.search(r'sound="([^"]+)"', block)
        lang_m = re.search(r'lang="([^"]+)"', block)
        anim_id_m = re.search(r'id="([^"]+)"', block)
        
        on_obj = obj_m.group(1) if obj_m else None
        snd_id = snd_m.group(1) if snd_m else None
        lang = lang_m.group(1) if lang_m else None
        anim_id = anim_id_m.group(1) if anim_id_m else None
        
        snd_path = audio_map.get(snd_id) if snd_id else None
        if on_obj:
            touch_triggers.append({
                'targetObject': on_obj,
                'animationId': anim_id,
                'sound': snd_path,
                'lang': lang
            })
            
    return ambient_audio, touch_triggers

def main():
    audio_map = parse_opf()
    
    scene_files = sorted(glob.glob(os.path.join(OEBPS_DIR, 'Szene_*.html')))
    scenes_data = []
    
    # Custom titles for the 22 scenes
    scene_titles = {
        0: {"RU": "Вступление: Часовой город", "EN": "Intro: Clocktown", "DE": "Intro: Die Uhrenstadt"},
        1: {"RU": "Глава 1: Пробуждение", "EN": "Chapter 1: The Awakening", "DE": "Kapitel 1: Das Erwachen"},
        2: {"RU": "Глава 2: Воспоминания о лете", "EN": "Chapter 2: Memories of Summer", "DE": "Kapitel 2: Erinnerungen an den Sommer"},
        3: {"RU": "Глава 3: Снег за окном", "EN": "Chapter 3: Snow at the Window", "DE": "Kapitel 3: Schnee am Fenster"},
        4: {"RU": "Глава 4: Золотая осень", "EN": "Chapter 4: Golden Autumn", "DE": "Kapitel 4: Goldener Herbst"},
        5: {"RU": "Глава 5: Весенняя капель", "EN": "Chapter 5: Spring Melody", "DE": "Kapitel 5: Frühlingsmelodie"},
        6: {"RU": "Глава 6: Поляна часов", "EN": "Chapter 6: The Meadow of Clocks", "DE": "Kapitel 6: Die Uhrenwiese"},
        7: {"RU": "Глава 7: Времясипед", "EN": "Chapter 7: The Timecycle", "DE": "Kapitel 7: Das Zeitrad"},
        8: {"RU": "Глава 8: Улицы Часовьего города", "EN": "Chapter 8: Streets of Clocktown", "DE": "Kapitel 8: Straßen der Uhrenstadt"},
        9: {"RU": "Глава 9: Необычная витрина", "EN": "Chapter 9: The Curious Display", "DE": "Kapitel 9: Das seltsame Schaufenster"},
        10: {"RU": "Глава 10: Булочная перфекционизма", "EN": "Chapter 10: The Bakery of Perfection", "DE": "Kapitel 10: Die Bäckerei der Perfektion"},
        11: {"RU": "Глава 11: Разговор с Улиткой", "EN": "Chapter 11: The Snail", "DE": "Kapitel 11: Die Schnecke"},
        12: {"RU": "Глава 12: Лавка старых часов", "EN": "Chapter 12: Old Clock Shop", "DE": "Kapitel 12: Der alte Uhrenladen"},
        13: {"RU": "Глава 13: В гостях у Мастера", "EN": "Chapter 13: The Clockmaker", "DE": "Kapitel 13: Beim Uhrmacher"},
        14: {"RU": "Глава 14: Голос из темноты", "EN": "Chapter 14: A Voice in the Dark", "DE": "Kapitel 14: Eine Stimme im Dunkeln"},
        15: {"RU": "Глава 15: Живые воспоминания", "EN": "Chapter 15: Living Memories", "DE": "Kapitel 15: Lebendige Erinnerungen"},
        16: {"RU": "Глава 16: Пыльный Кот", "EN": "Chapter 16: The Dusty Cat", "DE": "Kapitel 16: Die staubige Katze"},
        17: {"RU": "Глава 17: Снова в путь", "EN": "Chapter 17: Back on the Road", "DE": "Kapitel 17: Wieder unterwegs"},
        18: {"RU": "Глава 18: Протестные часы", "EN": "Chapter 18: The Protest Clocks", "DE": "Kapitel 18: Die Protestuhren"},
        19: {"RU": "Глава 19: Площадь времени", "EN": "Chapter 19: The Square of Time", "DE": "Kapitel 19: Der Platz der Zeit"},
        20: {"RU": "Глава 20: Дорога домой", "EN": "Chapter 20: The Road Home", "DE": "Kapitel 20: Der Weg nach Hause"},
        21: {"RU": "Финал: Лето на дворе", "EN": "Epilogue: Summer Outside", "DE": "Epilog: Es ist Sommer"},
    }
    
    for idx, h_file in enumerate(scene_files):
        s_name = os.path.basename(h_file).replace('.html', '')
        smil_file = os.path.join(OEBPS_DIR, f'{s_name}.smil')
        xml_file = os.path.join(OEBPS_DIR, 'anim', f'{s_name}.xml')
        
        bg_image, overlays, text_blocks = parse_html_scene(h_file)
        smil_data = parse_smil(smil_file, audio_map)
        ambient_audio, touch_triggers = parse_anim_xml(xml_file, audio_map, idx)
        
        # Format scene number padded
        scene_num_str = f"{idx:04d}"
        
        # Build language structures
        languages = {}
        for lang in ['RU', 'EN', 'DE']:
            txt_obj = text_blocks.get(lang)
            smil_obj = smil_data.get(lang, {})
            
            # Special case for Szene_000 (Intro)
            if idx == 0:
                narration_audio = f"media/Szene_00__S00_Narration{lang}.mp3"
                full_text = "Мышонок в Часовьем городе" if lang == 'RU' else ("The Little Mouse in Clocktown" if lang == 'EN' else "Die kleine Maus in der Uhrenstadt")
                words_list = []
            else:
                narration_audio = smil_obj.get('audio')
                full_text = txt_obj['fullText'] if txt_obj else ''
                words_list = []
                if txt_obj and 'words' in txt_obj:
                    for w in txt_obj['words']:
                        w_id = w['id']
                        timing = smil_obj.get('words', {}).get(w_id, {})
                        words_list.append({
                            'id': w_id,
                            'text': w['text'],
                            'start': timing.get('start', 0),
                            'end': timing.get('end', 0)
                        })
            
            languages[lang] = {
                'audio': narration_audio,
                'duration': smil_obj.get('end', 0),
                'fullText': full_text,
                'words': words_list
            }
            
        # Ambient audio special cases
        if idx == 0:
            ambient_audio = "media/Szene_00__INTRO.mp3"
            
        scene_item = {
            'id': s_name,
            'index': idx,
            'titles': scene_titles.get(idx, {"RU": f"Глава {idx}", "EN": f"Chapter {idx}", "DE": f"Kapitel {idx}"}),
            'bgImage': bg_image,
            'ambientAudio': ambient_audio,
            'thumbnail': {
                'RU': f"screenshots/chapter{scene_num_str}RU.png",
                'EN': f"screenshots/chapter{scene_num_str}EN.png",
                'DE': f"screenshots/chapter{scene_num_str}DE.png"
            },
            'languages': languages,
            'overlays': overlays,
            'touchTriggers': touch_triggers
        }
        scenes_data.append(scene_item)
        print(f"Parsed {s_name}: RU words={len(languages['RU']['words'])}, Overlays={len(overlays)}, Triggers={len(touch_triggers)}, Ambient={ambient_audio}")
        
    book_manifest = {
        'title': 'Мышонок в Часовьем городе',
        'englishTitle': 'The Little Mouse in Clocktown',
        'author': 'Afrikyan',
        'aspectRatio': '4/3',
        'baseWidth': 1024,
        'baseHeight': 768,
        'totalScenes': len(scenes_data),
        'scenes': scenes_data
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        json.dump(book_manifest, out, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully generated {OUTPUT_FILE} with {len(scenes_data)} scenes!")

if __name__ == '__main__':
    main()
