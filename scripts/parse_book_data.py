import os
import glob
import re
import json
import xml.etree.ElementTree as ET

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
    
    pars = re.findall(r'<par\s+id="([^"]+)">\s*<text\s+src="([^"]+)"></text>\s*<audio\s+src="([^"]+)"\s+clipBegin="([^"]+)"\s+clipEnd="([^"]+)"></audio>\s*</par>', content)
    
    for par_id, text_src, audio_src, clip_b, clip_e in pars:
        clip_b_sec = float(clip_b.rstrip('s'))
        clip_e_sec = float(clip_e.rstrip('s'))
        
        for lang in ['RU', 'EN', 'DE']:
            if lang in text_src or f'_{lang}' in audio_src or f'{lang}.text' in audio_src:
                lang_data[lang]['audio'] = audio_src
                lang_data[lang]['begin'] = clip_b_sec
                lang_data[lang]['end'] = clip_e_sec
                
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
        
    bg_images = re.findall(r'<img\s+src="(images/Szene_\d+\.[a-zA-Z]+)"', html)
    if not bg_images:
        bg_images = re.findall(r'<img\s+src="([^"]+)"', html)
    bg_image = bg_images[-1] if bg_images else ''
    
    div_blocks = re.findall(r'(<div\s+class="(?:overlay|text-overlay)[^"]*"[^>]*>.*?</div>)', html, re.DOTALL)
    
    overlays = []
    text_blocks = {'RU': None, 'EN': None, 'DE': None}
    centers = {} # elem_id -> (cx, cy)
    
    for block in div_blocks:
        cls_m = re.search(r'class="([^"]+)"', block)
        classes = cls_m.group(1).split() if cls_m else []
        
        id_m = re.search(r'oskar:id="([^"]+)"', block)
        elem_id = id_m.group(1) if id_m else ''
        
        if 'Watermark' in elem_id:
            continue
            
        style_m = re.search(r'style="([^"]+)"', block)
        style_str = style_m.group(1) if style_m else ''
        
        if 'width: 0.000000%' in style_str and 'height: 0.000000%' in style_str:
            continue
            
        lang = None
        for l in ['RU', 'EN', 'DE']:
            if f'lang{l}' in classes or elem_id.endswith(l) or f'_{l}' in elem_id or f'C{l}' in elem_id:
                lang = l
                break
                
        img_m = re.search(r'<img\s+src="([^"]+)"', block)
        img_src = img_m.group(1) if img_m else None
        
        if img_src and re.search(r'[0-9a-f]{8}-[0-9a-f]{4}', img_src):
            continue

        # Parse coordinates for center
        lp = re.search(r'left:\s*([\d\.-]+)%', style_str)
        tp = re.search(r'top:\s*([\d\.-]+)%', style_str)
        wp = re.search(r'width:\s*([\d\.-]+)%', style_str)
        hp = re.search(r'height:\s*([\d\.-]+)%', style_str)
        if lp and tp and wp and hp:
            l = float(lp.group(1)) * 1024 / 100
            t = float(tp.group(1)) * 768 / 100
            w = float(wp.group(1)) * 1024 / 100
            h = float(hp.group(1)) * 768 / 100
            centers[elem_id] = (l + w / 2, t + h / 2)

        is_ss_alt = bool(re.search(r'_SSFRM[1-9]', elem_id))
        is_touch_target = (img_src is None) and ('button' in elem_id.lower() or 'touch' in elem_id.lower())
        
        # For non-spritesheet layers that had opacity 0 in TigerCreate, restore base opacity
        if img_src and 'opacity: 0.000000' in style_str:
            if not is_ss_alt:
                style_str = style_str.replace('opacity: 0.000000', 'opacity: 1.000000')
            
        is_text = 'text-overlay' in classes
        if is_text:
            word_spans = re.findall(r'<span\s+id="([^"]+)">([^<]+)</span>', block)
            words = [{'id': w_id, 'text': w_txt.strip()} for w_id, w_txt in word_spans]
            full_text = ' '.join([w['text'] for w in words])
            
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
                'isTouchTarget': is_touch_target
            })
            
    return bg_image, overlays, text_blocks, centers

def simplify_track(keyframes, tol_pos=1.0, tol_scale=0.02, tol_rot=1.0, tol_alpha=0.02):
    if len(keyframes) <= 2:
        return keyframes
    result = [keyframes[0]]
    i = 0
    n = len(keyframes)
    while i < n - 1:
        best_j = i + 1
        max_look = min(n, i + 50)
        for j in range(i + 2, max_look):
            t0, st0 = keyframes[i]
            t1, st1 = keyframes[j]
            dt = t1 - t0
            if dt == 0:
                continue
            valid = True
            for k in range(i + 1, j):
                tk, stk = keyframes[k]
                frac = (tk - t0) / dt
                interp_x = st0['x'] + (st1['x'] - st0['x']) * frac
                interp_y = st0['y'] + (st1['y'] - st0['y']) * frac
                if abs(stk['x'] - interp_x) > tol_pos or abs(stk['y'] - interp_y) > tol_pos:
                    valid = False
                    break
                interp_sx = st0['sx'] + (st1['sx'] - st0['sx']) * frac
                interp_sy = st0['sy'] + (st1['sy'] - st0['sy']) * frac
                if abs(stk['sx'] - interp_sx) > tol_scale or abs(stk['sy'] - interp_sy) > tol_scale:
                    valid = False
                    break
                interp_r = st0['r'] + (st1['r'] - st0['r']) * frac
                if abs(stk['r'] - interp_r) > tol_rot:
                    valid = False
                    break
                interp_a = st0['a'] + (st1['a'] - st0['a']) * frac
                if abs(stk['a'] - interp_a) > tol_alpha:
                    valid = False
                    break
            if valid:
                best_j = j
            else:
                break
        result.append(keyframes[best_j])
        i = best_j
    return result

def parse_animations_and_logic(xml_file, logic_root, centers, audio_map, scene_idx, scene_name):
    ambient_audio = None
    if not os.path.exists(xml_file):
        return None, [], {}, {}

    tree = ET.parse(xml_file)
    
    # Ambient sound
    amb_tag = tree.find('.//animation[@ambient_sound="true"]')
    if amb_tag is not None:
        snd = amb_tag.get('sound')
        if snd and snd in audio_map:
            ambient_audio = audio_map[snd]
            
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

    start_anims = []
    touch_anims = {} # anim_id -> BookAnimation
    anim_on_objs = {} # on_obj -> set of anim_ids

    for anim in tree.findall('.//animation'):
        aid = anim.get('id')
        typ = anim.get('type')
        rep = int(anim.get('repeat', '1'))
        on_obj = anim.get('onObject')
        snd = anim.get('sound')
        lang = anim.get('lang', '')
        
        tracks = []
        for obj in anim.findall('object'):
            oid = obj.get('id')
            cx, cy = centers.get(oid, (512, 384))
            raw_frames = obj.findall('.//frame')
            if not raw_frames:
                continue
            cur = {'x': cx, 'y': cy, 'sx': 1, 'sy': 1, 'r': 0, 'a': 1}
            parsed = []
            for i, fr in enumerate(raw_frames):
                p = fr.get('p')
                if p:
                    parts = [float(x) for x in p.split()]
                    cur['x'], cur['y'] = parts[0], parts[1]
                s_val = fr.get('s')
                if s_val:
                    parts = [float(x) for x in s_val.split()]
                    cur['sx'], cur['sy'] = parts[0], parts[1]
                r_val = fr.get('r')
                if r_val:
                    cur['r'] = float(r_val)
                a_val = fr.get('a')
                if a_val:
                    cur['a'] = float(a_val)
                parsed.append((i * 0.05, dict(cur)))
            
            simp = simplify_track(parsed)
            dur = (len(raw_frames) - 1) * 0.05
            kfs = []
            for t, st in simp:
                dx = round(st['x'] - cx, 1)
                dy = round(st['y'] - cy, 1)
                kfs.append({
                    'offset': round(t / dur if dur > 0 else 0, 3),
                    'transform': f'translate({dx}px, {dy}px) rotate({round(st["r"], 1)}deg) scale({round(st["sx"], 3)}, {round(st["sy"], 3)})',
                    'opacity': round(st['a'], 3)
                })
            tracks.append({
                'targetId': oid,
                'durationMs': round(dur * 1000),
                'keyframes': kfs
            })
            
        anim_obj = {
            'id': aid,
            'type': typ,
            'repeat': rep,
            'lang': lang,
            'tracks': tracks
        }
        
        if typ == 'start':
            if tracks:
                start_anims.append(anim_obj)
        else:
            touch_anims[aid] = anim_obj
            if on_obj:
                if on_obj not in anim_on_objs:
                    anim_on_objs[on_obj] = set()
                anim_on_objs[on_obj].add(aid)

    # Now parse logic.lxml for touch mappings
    touch_actions = {} # target_id -> { animationIds: [], sound: null }
    if logic_root is not None:
        for obj in logic_root.findall('obj'):
            oid = obj.get('id')
            if oid.startswith(scene_name):
                acts = []
                snd = None
                for ev in obj.findall('event'):
                    if ev.get('type') == 'touch':
                        for act in ev.findall('action'):
                            an = act.get('animation')
                            s = act.get('sound')
                            if an:
                                acts.append(an)
                            if s:
                                snd = s
                if acts or snd:
                    snd_path = audio_map.get(snd) if snd else None
                    touch_actions[oid] = {
                        'animationIds': acts,
                        'sound': snd_path
                    }

    # Also merge onObjects from anim.xml
    for on_obj, aids in anim_on_objs.items():
        if on_obj not in touch_actions:
            touch_actions[on_obj] = {
                'animationIds': list(aids),
                'sound': None
            }
        else:
            for aid in aids:
                if aid not in touch_actions[on_obj]['animationIds']:
                    touch_actions[on_obj]['animationIds'].append(aid)

    # For any button overlay, also copy touch action to visual object
    added_visuals = {}
    for tid, act in touch_actions.items():
        if 'button' in tid.lower():
            clean_id = re.sub(r'1?button', '', tid, flags=re.IGNORECASE)
            if clean_id not in touch_actions and clean_id in centers:
                added_visuals[clean_id] = act
    touch_actions.update(added_visuals)

    return ambient_audio, start_anims, touch_anims, touch_actions

def main():
    audio_map = parse_opf()
    
    logic_file = os.path.join(OEBPS_DIR, 'anim', 'logic.lxml')
    logic_root = ET.parse(logic_file).getroot() if os.path.exists(logic_file) else None
    
    scene_files = sorted(glob.glob(os.path.join(OEBPS_DIR, 'Szene_*.html')))
    scenes_data = []
    
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
        
        bg_image, overlays, text_blocks, centers = parse_html_scene(h_file)
        smil_data = parse_smil(smil_file, audio_map)
        ambient_audio, start_anims, touch_anims, touch_actions = parse_animations_and_logic(xml_file, logic_root, centers, audio_map, idx, s_name)
        
        scene_num_str = f"{idx:04d}"
        
        languages = {}
        for lang in ['RU', 'EN', 'DE']:
            txt_obj = text_blocks.get(lang)
            smil_obj = smil_data.get(lang, {})
            
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
            'startAnimations': start_anims,
            'touchAnimations': touch_anims,
            'touchActions': touch_actions
        }
        scenes_data.append(scene_item)
        print(f"Parsed {s_name}: Overlays={len(overlays)}, StartAnims={len(start_anims)}, TouchAnims={len(touch_anims)}, TouchActions={len(touch_actions)}")
        
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
        
    print(f"\nSuccessfully generated {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE)/1024/1024:.2f} MB) with {len(scenes_data)} scenes!")

if __name__ == '__main__':
    main()
