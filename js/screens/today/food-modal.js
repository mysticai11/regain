/* Today food modals: search food items, serving selector, custom food & recipe builder */

import { profile } from "../../state.js";
import { ls, sv, dayRecord, saveDayRecord } from "../../storage.js";
import { esc } from "../../lib/format.js";
import { ic } from "../../lib/dom.js";
import { showToast } from "../../components/toast.js";

export function openFoodSearch(callback) {
  var overlay = document.createElement('div'); overlay.className='overlay'; overlay.id='foodOverlay';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border:none;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    +'<div class="sheet-handle"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      +'<div style="font-size:28px;font-weight:600;color:#F5F5F4;line-height:1.15">Add Food</div>'
      +'<button type="button" class="btn-text-action" id="closeFoodSearch" style="font-size:15px;color:#8A8A8E;background:none;border:none;padding:0;cursor:pointer">Close</button>'
    +'</div>'
    +'<input type="text" id="foodSearchInput" placeholder="Search foods (e.g. chicken, oats…)" autocomplete="off" style="background:#1C1C1F;border:none;border-radius:12px;height:48px;padding:0 16px;color:#F5F5F4;font-size:17px;width:100%;box-sizing:border-box">'
    +'<div id="searchResults" style="max-height:360px;overflow-y:auto"></div>'
    +'<div style="display:flex;gap:16px;margin-top:16px">'
      +'<button type="button" class="btn-text-action" id="createCustomBtn" style="color:#F5F5F4;font-size:15px;font-weight:600;background:none;border:none;padding:0;cursor:pointer">+ Custom food</button>'
      +'<button type="button" class="btn-text-action" id="createRecipeBtn" style="color:#8A8A8E;font-size:15px;background:none;border:none;padding:0;cursor:pointer">+ Build recipe</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);

  function closeSearch(){overlay.remove();}
  document.getElementById('closeFoodSearch').addEventListener('click',closeSearch);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeSearch();});

  var recent = ls('rg_recent_foods', []).slice(0, 8);
  function renderRecentFoodsInSheet() {
    var zone = document.getElementById('searchResults');
    if (!zone) return;
    if (!recent.length) { zone.innerHTML = ''; return; }
    zone.innerHTML = '<div style="margin-top:16px;margin-bottom:6px"><span style="font-size:11px;font-weight:600;color:#8A8A8E;text-transform:uppercase;letter-spacing:0.08em">Recent Foods</span></div>'
      + recent.map(function(r) {
        var rKc = Math.round(r.kcal || 0);
        var rPr = Math.round(r.protein || 0);
        return '<div class="list-row quick-recent-sheet" data-food="' + encodeURIComponent(JSON.stringify(r)) + '" style="min-height:56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;cursor:pointer;padding:10px 0">'
          + '<span style="font-size:17px;font-weight:500;color:#F5F5F4">' + esc(r.name) + '</span>'
          + '<span style="font-size:15px;color:#8A8A8E;font-variant-numeric:tabular-nums">' + rKc + ' kcal · ' + rPr + ' g</span>'
        + '</div>';
      }).join('');
    zone.querySelectorAll('.quick-recent-sheet').forEach(function(row) {
      row.onclick = function() {
        var food = JSON.parse(decodeURIComponent(row.dataset.food));
        closeSearch();
        callback(food, 1);
      };
    });
  }
  renderRecentFoodsInSheet();

  var timer2;
  document.getElementById('foodSearchInput').addEventListener('input',function(){
    var q=this.value.trim();
    clearTimeout(timer2);
    if(!q){renderRecentFoodsInSheet();return;}
    timer2=setTimeout(function(){
      FoodDB.search(q).then(function(results){renderSearchResults(results,callback,closeSearch);});
    },200);
  });
  document.getElementById('foodSearchInput').focus();

  document.getElementById('createCustomBtn').addEventListener('click',function(){
    overlay.remove(); openCustomFoodBuilder(callback);
  });
  document.getElementById('createRecipeBtn').addEventListener('click',function(){
    overlay.remove(); openRecipeBuilder(callback);
  });
}

export function renderSearchResults(results, callback, closeSearch) {
  var zone = document.getElementById('searchResults'); if(!zone) return;
  if(!results.length){zone.innerHTML='<div style="padding:20px 0;text-align:center;color:var(--text-muted);font-size:15px">No results. Try a different term or create a custom food.</div>';return;}
  zone.innerHTML = results.map(function(f,i){
    var perServing = foodMacros(f,1);
    return '<div class="search-result" data-idx="'+i+'">'
      +'<div><div class="search-result-name">'+f.name+'</div><div class="search-result-meta">'+f.unit+' · '+perServing.kcal+' kcal · '+perServing.protein+'P '+perServing.carbs+'C '+perServing.fat+'F'+(f._type==='custom'?' <span class="search-result-tag">custom</span>':'')+'</div></div>'
      +'</div>';
  }).join('');
  results.forEach(function(food,i){
    var el=zone.querySelectorAll('.search-result')[i];
    if(el) el.addEventListener('click',function(){ openServingSelector(food,callback,closeSearch); });
  });
}

export function openServingSelector(food, callback, closeSearch) {
  var overlay = document.createElement('div'); overlay.className='overlay'; overlay.id='servingOverlay';
  var ps = foodMacros(food,1);
  overlay.innerHTML = '<div class="sheet">'
    +'<div class="sheet-handle"></div>'
    +'<div class="sheet-title">'+food.name+'</div>'
    +'<div style="color:var(--text-muted);font-size:11px;margin-bottom:8px">'+food.unit+' = '+food.serving_g+'g</div>'
    +'<div class="food-detail-macros">'
      +'<div class="food-detail-macro"><div class="val">'+ps.kcal+'</div><div class="lbl">kcal</div></div>'
      +'<div class="food-detail-macro"><div class="val amber">'+ps.protein+'g</div><div class="lbl">protein</div></div>'
      +'<div class="food-detail-macro"><div class="val sage">'+ps.carbs+'g</div><div class="lbl">carbs</div></div>'
      +'<div class="food-detail-macro"><div class="val" style="color:var(--rust-light)">'+ps.fat+'g</div><div class="lbl">fat</div></div>'
    +'</div>'
    +'<label class="eyebrow" style="margin-bottom:6px">Servings</label>'
    +'<input type="number" id="servingsInput" value="1" step="0.25" min="0.25" max="20" inputmode="decimal">'
    +'<div id="servingPreview" style="font-size:11px;color:var(--text-muted);margin-top:8px">= '+ps.kcal+' kcal · '+ps.protein+'P · '+ps.carbs+'C · '+ps.fat+'F</div>'
    +'<div class="modal-actions" style="margin-top:14px">'
      +'<button class="btn" id="cancelServingBtn">Back</button>'
      +'<button class="btn btn-primary" id="confirmServingBtn">Add to log</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);

  document.getElementById('servingsInput').addEventListener('input',function(){
    var s=parseFloat(this.value)||1; var m=foodMacros(food,s);
    document.getElementById('servingPreview').textContent='= '+m.kcal+' kcal · '+m.protein+'P · '+m.carbs+'C · '+m.fat+'F';
  });
  document.getElementById('cancelServingBtn').addEventListener('click',function(){overlay.remove();});
  document.getElementById('confirmServingBtn').addEventListener('click',function(){
    var s=parseFloat(document.getElementById('servingsInput').value)||1;
    overlay.remove(); if(closeSearch) closeSearch();
    callback(food,s);
  });
}

// ── Custom food builder ────────────────────────────────────────────────────────
export function openCustomFoodBuilder(callback) {
  var overlay=document.createElement('div'); overlay.className='overlay';
  overlay.innerHTML='<div class="sheet">'
    +'<div class="sheet-handle"></div>'
    +'<div class="sheet-title">Custom food</div>'
    +'<label class="eyebrow" style="margin-top:8px">Name</label><input type="text" id="cfName" placeholder="e.g. Home protein shake">'
    +'<label class="eyebrow" style="margin-top:8px">Serving size label</label><input type="text" id="cfUnit" placeholder="e.g. 1 shake, 100g">'
    +'<label class="eyebrow" style="margin-top:8px">Grams per serving</label><input type="number" id="cfGrams" placeholder="e.g. 350" inputmode="numeric">'
    +'<label class="eyebrow" style="margin-top:8px">Calories per serving</label><input type="number" id="cfKcal" placeholder="e.g. 480" inputmode="numeric">'
    +'<label class="eyebrow" style="margin-top:8px">Protein (g) per serving</label><input type="number" step="0.1" id="cfProt" placeholder="e.g. 30" inputmode="decimal">'
    +'<label class="eyebrow" style="margin-top:8px">Carbs (g) per serving</label><input type="number" step="0.1" id="cfCarb" placeholder="e.g. 55" inputmode="decimal">'
    +'<label class="eyebrow" style="margin-top:8px">Fat (g) per serving</label><input type="number" step="0.1" id="cfFat" placeholder="e.g. 12" inputmode="decimal">'
    +'<div class="modal-actions" style="margin-top:14px">'
      +'<button class="btn" id="cancelCFBtn">Cancel</button>'
      +'<button class="btn btn-primary" id="saveCFBtn">Save & add</button>'
    +'</div></div>';
  document.body.appendChild(overlay);
  document.getElementById('cancelCFBtn').addEventListener('click',function(){overlay.remove();});
  document.getElementById('saveCFBtn').addEventListener('click',function(){
    var name=document.getElementById('cfName').value.trim();
    var unit=document.getElementById('cfUnit').value.trim()||'1 serving';
    var g=parseFloat(document.getElementById('cfGrams').value)||100;
    var kcal=parseFloat(document.getElementById('cfKcal').value)||0;
    var prot=parseFloat(document.getElementById('cfProt').value)||0;
    var carb=parseFloat(document.getElementById('cfCarb').value)||0;
    var fat=parseFloat(document.getElementById('cfFat').value)||0;
    if(!name||!kcal){showToast('Name and calories required','warn');return;}
    // Store per 100g so it's consistent with FOODS array
    var factor = 100/g;
    FoodDB.addCustom({name:name,unit:unit,serving_g:g,kcal:+(kcal*factor).toFixed(1),protein:+(prot*factor).toFixed(2),carbs:+(carb*factor).toFixed(2),fat:+(fat*factor).toFixed(2)}).then(function(id){
      overlay.remove();
      var pseudo = {name:name,unit:unit,serving_g:g,kcal:+(kcal*factor).toFixed(1),protein:+(prot*factor).toFixed(2),carbs:+(carb*factor).toFixed(2),fat:+(fat*factor).toFixed(2),id:id,_type:'custom'};
      if(callback) openServingSelector(pseudo,callback,null);
    });
  });
}

// ── Recipe builder ─────────────────────────────────────────────────────────────
export function openRecipeBuilder(callback) {
  var overlay=document.createElement('div'); overlay.className='overlay';
  var ingredients=[];
  function renderIngredients(){
    return ingredients.map(function(ing,i){
      var m=foodMacros(ing.food,ing.servings);
      return '<div class="ingredient-row"><div class="ingredient-name">'+ing.food.name+' ×'+ing.servings+'</div><div style="font-size:11px;color:var(--text-muted)">'+m.kcal+'kcal</div><button class="btn-ghost" data-ing="'+i+'">'+ic('trash')+'</button></div>';
    }).join('');
  }
  function totals(){
    var t={kcal:0,protein:0,carbs:0,fat:0};
    ingredients.forEach(function(ing){var m=foodMacros(ing.food,ing.servings);t.kcal+=m.kcal;t.protein+=m.protein;t.carbs+=m.carbs;t.fat+=m.fat;});
    return t;
  }
  function refresh(){
    var t=totals();
    var ir=overlay.querySelector('#ingList'); if(ir) ir.innerHTML=renderIngredients();
    var tr=overlay.querySelector('#recipeTotals'); if(tr) tr.textContent='Total: '+Math.round(t.kcal)+' kcal · '+t.protein.toFixed(1)+'P · '+t.carbs.toFixed(1)+'C · '+t.fat.toFixed(1)+'F';
    overlay.querySelectorAll('[data-ing]').forEach(function(b){
      b.addEventListener('click',function(){ingredients.splice(parseInt(b.dataset.ing,10),1);refresh();});
    });
  }
  overlay.innerHTML='<div class="sheet">'
    +'<div class="sheet-handle"></div>'
    +'<div class="sheet-title">Build recipe</div>'
    +'<label class="eyebrow" style="margin-top:8px">Recipe name</label><input type="text" id="recName" placeholder="e.g. Morning oats bowl">'
    +'<button class="btn btn-sm" id="addIngBtn" style="margin-top:10px">'+ic('plus')+' Add ingredient</button>'
    +'<div id="ingList" style="margin-top:8px"></div>'
    +'<div id="recipeTotals" style="font-size:11px;color:var(--text-muted);margin-top:8px">Total: 0 kcal</div>'
    +'<div class="modal-actions" style="margin-top:14px">'
      +'<button class="btn" id="cancelRcpBtn">Cancel</button>'
      +'<button class="btn btn-primary" id="saveRcpBtn">Save & add</button>'
    +'</div></div>';
  document.body.appendChild(overlay);
  refresh();
  document.getElementById('cancelRcpBtn').addEventListener('click',function(){overlay.remove();});
  document.getElementById('addIngBtn').addEventListener('click',function(){
    openFoodSearch(function(food,servings){ingredients.push({food:food,servings:servings});refresh();});
  });
  document.getElementById('saveRcpBtn').addEventListener('click',function(){
    var name=document.getElementById('recName').value.trim();
    if(!name){showToast('Enter a recipe name','warn');return;}
    var t=totals();
    var g=ingredients.reduce(function(s,ing){return s+ing.food.serving_g*ing.servings;},0)||100;
    var factor=100/g;
    var recipe={name:name,unit:'1 serving',serving_g:g,kcal:+(t.kcal*factor).toFixed(1),protein:+(t.protein*factor).toFixed(2),carbs:+(t.carbs*factor).toFixed(2),fat:+(t.fat*factor).toFixed(2),ingredients:ingredients.map(function(i){return {name:i.food.name,servings:i.servings};})};
    FoodDB.addRecipe(recipe).then(function(id){
      overlay.remove();
      var pseudo=Object.assign({},recipe,{id:id,_type:'recipe'});
      if(callback) openServingSelector(pseudo,callback,null);
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// SETTINGS SHEET
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ── Custom foods manager ───────────────────────────────────────────────────────
export function openCustomFoodsManager() {
  if (typeof window.FoodDB === 'undefined' || !window.FoodDB.getAllCustom) return;
  window.FoodDB.getAllCustom().then(function(foods){
    var overlay=document.createElement('div'); overlay.className='overlay';
    var rows = foods.length
      ? foods.map(function(f){
          var serving_kcal=Math.round(f.kcal*f.serving_g/100);
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
            +'<div style="flex:1"><div style="font-size:15px">'+f.name+'</div><div style="font-size:11px;color:var(--text-muted)">'+f.unit+' · '+serving_kcal+' kcal · '+f.protein+'P/100g</div></div>'
            +'<button class="btn-ghost" data-delcustom="'+f.id+'">'+ic('trash')+'</button>'
            +'</div>';
        }).join('')
      : '<div style="padding:20px 0;text-align:center;color:var(--text-muted)">No custom foods yet.</div>';
    overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Custom foods</div>'+rows
      +'<button class="btn" style="margin-top:14px" id="doneCustomBtn">Done</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#doneCustomBtn').addEventListener('click',function(){
      overlay.remove();
      if (typeof window.openSettings === 'function') window.openSettings();
    });
    overlay.querySelectorAll('[data-delcustom]').forEach(function(btn){
      btn.addEventListener('click',function(){
        window.FoodDB.deleteCustom(parseInt(btn.dataset.delcustom,10)).then(function(){overlay.remove();openCustomFoodsManager();});
      });
    });
  });
}

export function openMealEditor() {
  var tmpl = ls('rg_meals', DEFAULT_MEALS);
  var overlay=document.createElement('div'); overlay.className='overlay';
  var fields = tmpl.map(function(m,i){
    return '<div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:10px">'
      +'<input type="text" value="'+m.name+'" data-mname="'+i+'" style="margin-bottom:6px">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">'
        +'<input type="number" value="'+m.kcal+'" data-mkcal="'+i+'" placeholder="kcal" inputmode="numeric">'
        +'<input type="number" value="'+m.protein+'" data-mprot="'+i+'" placeholder="P(g)" inputmode="decimal">'
        +'<input type="number" value="'+m.carbs+'" data-mcarb="'+i+'" placeholder="C(g)" inputmode="decimal">'
        +'<input type="number" value="'+m.fat+'" data-mfat="'+i+'" placeholder="F(g)" inputmode="decimal">'
      +'</div>'
    +'</div>';
  }).join('');
  overlay.innerHTML='<div class="sheet"><div class="sheet-handle"></div><div class="sheet-title">Edit meal templates</div>'
    +'<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Edit name and macros per meal slot. Changes apply immediately.</div>'
    +fields
    +'<div class="modal-actions" style="margin-top:8px">'
      +'<button class="btn" id="cancelMealEdit">Cancel</button>'
      +'<button class="btn btn-primary" id="saveMealEdit">Save</button>'
    +'</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelMealEdit').addEventListener('click',function(){overlay.remove();});
  overlay.querySelector('#saveMealEdit').addEventListener('click',function(){
    tmpl.forEach(function(m,i){
      var n=overlay.querySelector('[data-mname="'+i+'"]'); if(n) m.name=n.value.trim()||m.name;
      var k=overlay.querySelector('[data-mkcal="'+i+'"]'); if(k) m.kcal=parseFloat(k.value)||m.kcal;
      var p=overlay.querySelector('[data-mprot="'+i+'"]'); if(p) m.protein=parseFloat(p.value)||m.protein;
      var c=overlay.querySelector('[data-mcarb="'+i+'"]'); if(c) m.carbs=parseFloat(c.value)||m.carbs;
      var f=overlay.querySelector('[data-mfat="'+i+'"]');  if(f) m.fat=parseFloat(f.value)||m.fat;
    });
    sv('rg_meals', tmpl); mealTemplates=tmpl;
    overlay.remove(); renderToday();
  });
}

// ── Generic bottom sheet ───────────────────────────────────────────────────────

export function openEditItemSheet(itemId, groupKey) {
  var plan = (profile && profile.mealPlan) || DEFAULT_MEAL_PLAN;
  var group = plan[groupKey];
  var item = group.items.find(function(it){ return it.id === itemId; });
  if(!item) return;
  
  var overlay = document.createElement('div'); overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet" style="position:relative"><div class="sheet-handle"></div>'
    + '<div class="sheet-title">Edit Item</div>'
    + '<label class="eyebrow" style="margin-top:12px">Name / Portion</label>'
    + '<input type="text" id="editItemName" value="' + item.name + '">'
    + '<label class="eyebrow" style="margin-top:12px">Calories (kcal)</label>'
    + '<input type="number" id="editItemKcal" value="' + item.kcal + '" inputmode="numeric">'
    + '<label class="eyebrow" style="margin-top:12px">Protein (g)</label>'
    + '<input type="number" id="editItemProt" value="' + item.protein + '" inputmode="numeric">'
    + '<label class="eyebrow" style="margin-top:12px">Carbs (g)</label>'
    + '<input type="number" id="editItemCarb" value="' + item.carbs + '" inputmode="numeric">'
    + '<label class="eyebrow" style="margin-top:12px">Fat (g)</label>'
    + '<input type="number" id="editItemFat" value="' + item.fat + '" inputmode="numeric">'
    + '<div class="modal-actions" style="margin-top:16px">'
      + '<button class="btn" id="cancelEditItemBtn">Cancel</button>'
      + '<button class="btn btn-primary" id="saveEditItemBtn">Save</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(overlay);
  
  overlay.querySelector('#cancelEditItemBtn').addEventListener('click', function(){ overlay.remove(); });
  overlay.querySelector('#saveEditItemBtn').addEventListener('click', function(){
    item.name = document.getElementById('editItemName').value.trim() || item.name;
    item.kcal = parseInt(document.getElementById('editItemKcal').value, 10) || 0;
    item.protein = parseFloat(document.getElementById('editItemProt').value) || 0;
    item.carbs = parseFloat(document.getElementById('editItemCarb').value) || 0;
    item.fat = parseFloat(document.getElementById('editItemFat').value) || 0;
    
    profile.mealPlan = plan;
    sv('rg_profile', profile);
    overlay.remove();
    if (typeof window !== 'undefined') {
      if (typeof window.renderTodaySimple === 'function') window.renderTodaySimple();
      if (typeof window.renderTab === 'function') window.renderTab();
    }
  });
}
