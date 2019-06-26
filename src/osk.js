var katex = require('../lib/katex/katex-modified.min.js');

/**
    @class
    @classdesc To enable the on-screen keyboard, ensure all Guppy
    instances have been initialised and then create a new GuppyOSK
    object with `new GuppyOSK()`.  This will cause any instances of
    the editor to, when focused, create an on-screen keyboard at the
    bottom of the screen with tabs for the various groups of symbols.
    @param {Object} [config] - Configuration options for the on-screen keyboard
    @param {string} [config.goto_tab] - The name of the group whose
    tab the keyboard should jump to every time a key is pressed.
    For example, the value `"abc"` will cause the keyboard to revert
    to the lower-case alphanumeric tab every time a key is pressed.
    @param {string} [config.attach] - A string describing how the
    keyboard should be attached to the editor.  Currently, the only
    supported value is `"focus"`, meaning the keyboard will be
    attached when the editor is focused and detached when unfocused.
    If this value is absent, the OSK button in the editor will be the
    only way to trigger it.
    @constructor
*/
var GuppyOSK = function(config){
    this.config = config || {};
    this.guppy = null;
    this.element = null;
}

GuppyOSK.blank = "\\blue{[?]}";
GuppyOSK.text_blank = "[?]";

function elt(name, attrs, content){
    var ans = document.createElement(name);
    if(attrs) for(var a in attrs) ans.setAttribute(a,attrs[a]);
    if(content) ans.innerHTML = content;
    return ans;
}

function click_listener(elt, fn){
    elt.addEventListener("click", fn, false);
    elt.addEventListener("touchend", fn, false);
    elt.addEventListener("touchmove", move, false);
}

function move(e) {
    Guppy.kb.is_scroll = true;
}

function make_tabs(element){
    var headers = element.querySelectorAll("li a");
    var tabs = element.getElementsByClassName("guppy_osk_group");
    tabs[0].style.display = "block";
    headers[0].classList.add("active_tab");
    for(var j = 0; j < headers.length; j++){
        if(j != 0) tabs[j].style.display = "none";
        var header = headers[j];
        click_listener(header, function(e){
            Guppy.kb.is_scroll = false;
            for(var i = 0; i < headers.length; i++){
                tabs[i].style.display = "none";
                headers[i].classList.remove("active_tab");
            }
            e.target.closest('a').classList.add("active_tab");
            element.querySelector(e.target.closest('a').getAttribute("href")).style.display = "block";
            return false;
        });
    }
}

/**
    Detach the keyboard from the currently attached editor (if any)
    and hide it.
    @memberof GuppyOSK
*/
GuppyOSK.prototype.detach = function(guppy){
    if(this.element){
	if((!guppy && this.guppy) || this.guppy == guppy){
            document.body.removeChild(this.element);
            this.guppy = null;
            this.element = null;
	}
    }
}

/**
    Attach the keyboard to a Guppy instance and display it.
    @param {Guppy} [guppy] - The instance of Guppy to which the
    keyboard will attach.
    @memberof GuppyOSK
*/
GuppyOSK.prototype.attach = function(guppy){
    var self = this;
    var s = null;
    if(this.guppy == guppy) return;
    if(this.guppy){
        document.body.removeChild(this.element);
        this.element = null;
        this.guppy = null;
    }

    var syms = guppy.engine.symbols;
    var osk = elt("div",{"class":"guppy_osk",id: "guppy_osk"});
    var sym_tabs = elt("div",{"class":"keys tabbed"});
    var controls = elt("div",{"class":"controls row"});
    var customs = elt("div",{"class":"controls row"});

    var tab_bar = elt("ul");
    sym_tabs.appendChild(tab_bar);
    var grouped = {"digits":[],"qwerty":[],"QWERTY":[]};
    var digit = "1234567890\n\t\t+-=*./";
    for (var p = 0; p < digit.length; p++) {
      if (digit[p] == "\n") {
          grouped["digits"].push({break: true});
      } else if (digit[p] == "\t") {
           grouped["digits"].push({tab: true});
      } else if (digit[p] == "/") {
          grouped["digits"].push({name: "/",latex: "/"})
      } else if (digit[p] == "*") {
          grouped["digits"].push({name: "*",latex: "\\cdot"});
      } else {
          var latex = digit[p];
          var name = digit[p];
          if (latex == ".") {
             latex = "." + GuppyOSK.blank;
          }
          grouped["digits"].push({name: name,latex: latex});
      }
    }
    var abc = "qwertyuiop\n\t\tasdfghjkl\n\t\t\tzxcvbnm";
    for(var i = 0; i < abc.length; i++){
        if(abc[i] == "\n"){
            grouped["qwerty"].push({"break":true});
            grouped["QWERTY"].push({"break":true});
        }
        else if(abc[i] == "\t"){
            grouped["qwerty"].push({"tab":true});
            grouped["QWERTY"].push({"tab":true});
        }
        else{
            var latex = abc[i];
            var upper_latex = latex.toUpperCase();
            var name = abc[i];
            if(latex == "."){
                latex = "."+GuppyOSK.blank;
                upper_latex = latex;
            }
            grouped["qwerty"].push({"name":name, "latex":latex});
            grouped["QWERTY"].push({"name":name.toUpperCase(), "latex":upper_latex});
        }
    }
    for(s in syms){
        var group = syms[s].attrs.group;
        if(!grouped[group]) grouped[group] = [];
        var display = s == "text" ? GuppyOSK.text_blank : syms[s].output.latex.replace(/\{\$[0-9]+(\{[^}]+\})*\}/g, GuppyOSK.blank);
        grouped[group].push({"name":s,"latex":display});
    }
    var matrix_controls = null;
    var tab = function(key) {
      return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    };
    var icon = function(key) {
      switch (key) {
        case 'digits':
          return "123";
        case 'qwerty':
          return "q";
        case 'QWERTY':
          return "Q";
        case 'functions':
          return "\\sqrt{\\thinspace}";
        case 'editor':
          return "\\backslash";
        case 'calculus':
          return "\\displaystyle\\int";
        case 'array':
          return "\\left[\\thinspace\\right]";
        case 'operations':
          return "=";
        case 'symbols':
          return "\\alpha";
        default:
          return "";
      }
    };
    for(var g in grouped){
        var group_container = elt("div",{"class":"guppy_osk_group","id":g});
        var group_elt = elt("div",{"class":"guppy_osk_group_box","id":g});
        if(g == "array") matrix_controls = group_elt;
        var el = elt("li", {}, "<a href='#" + g + "' id='guppy_osk_" + g + "_tab'><span class='tab-icon'></span>" + tab(g) + "</a>");
        tab_bar.appendChild(el);
        katex.render(icon(g), el.getElementsByTagName('span')[0]);
        for(s in grouped[g]){
            var sym = grouped[g][s];
            if(sym['break']){
                group_elt.appendChild(elt("br"));
            }
            else if(sym['tab']){
                group_elt.appendChild(elt("span",{"class":"spacer"}));
            }
            else{
                var key = elt("span",{"class":"guppy_osk_key"});
                var f = null;
                if(g == "qwerty" || g == "QWERTY" || g == "digits"){
                    f = function(n){
                        click_listener(key, function(e){
                            e.preventDefault();
                            guppy.engine.insert_string(n);
                            guppy.render();
                            if(self.config.goto_tab){
                                document.getElementById("guppy_osk_"+self.config.goto_tab+"_tab").click();
                            }
                            e.preventDefault();
                            return false;
                        });
                    };
                    f(sym.name);
                } else {
                    f = function(n){
                        click_listener(key, function(e){
                            e.preventDefault();
                            if (!Guppy.kb.is_scroll) {
                                guppy.engine.insert_symbol(n);
                            } else {
                                Guppy.kb.is_scroll = false;
                            }
                            guppy.render();
                            if(self.config.goto_tab){
                                document.getElementById("guppy_osk_"+self.config.goto_tab+"_tab").click();
                            }
                            e.preventDefault();
                            return false;
                        });
                    };
                    f(sym.name);
                }
                group_elt.appendChild(key);
		katex.render(sym.latex, key);
            }
        }
        group_container.appendChild(group_elt);
        sym_tabs.appendChild(group_container);
    }
    make_tabs(sym_tabs);
    osk.appendChild(sym_tabs);
    var bottomIcon = function(key) {
        switch (key) {
        case 'undo':
          return ' \
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round">\
                <polyline points=".5 .5 .5 4.5 4.5 4.5"/>\
                <path d="M1.25,3.75 C3.095,1.165 6.7545,0.582 9.3395,2.427 C12.525,4.7005 12.557,9.435 9.3945,11.75"/>\
              </g>\
            </svg>\
          ';
        case 'redo':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(1)">\
                <polyline points="11.5 .5 11.5 4.5 7.5 4.5"/>\
                <path d="M10.75,3.75 C8.905,1.165 5.2455,0.582 2.6605,2.427 C-0.525,4.7005 -0.557,9.435 2.6055,11.75"/>\
              </g>\
            </svg>\
          ';
        case 'del':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="10" viewBox="0 0 13 10">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1)">\
                <path d="M4,5.5 L13,5.5"/>\
                <polyline points="7.75 1.5 4 5.25 7.75 9"/>\
                <path d="M1.5,0.5 L1.5,9.5"/>\
              </g>\
            </svg>\
          ';
        case 'cut':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round">\
                <circle cx="2.5" cy="10.5" r="2"/>\
                <circle cx="2.5" cy="2.5" r="2"/>\
                <path d="M13 11L1 4M13 2L1 9"/>\
              </g>\
            </svg>\
          ';
        case 'copy':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="17" viewBox="0 0 18 17">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round">\
                <path d="M11.5,3 L11.5,2 C11.5,1.17157288 10.3284271,0.5 9.5,0.5 L5.5,0.5"/>\
                <rect width="9" height="11" x="8.5" y="5.5" rx="1.5"/>\
                <path d="M11 8.5L15 8.5M11 10.5L15 10.5M11 12.5L13 12.5M9 .5L2 .5C1.17157288.5.5 1.17157288.5 2L.5 12C.5 12.8284271 1.17157288 13.5 2 13.5 2.88888889 13.5 4.22222222 13.5 6 13.5M3.25 4.5L7.5 4.5M3.25 6.5L5.25 6.5M3.25 8.5L5.25 8.5"/>\
              </g>\
            </svg>';
        case 'paste':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round">\
                <path d="M13 4L13 3C13 2.17157288 12.3284271 1.5 11.5 1.5L10.5 1.5M3.5 1.5L2 1.5C1.17157288 1.5.5 2.17157288.5 3L.5 13.5C.5 14.3284271 1.17157288 15.5 2 15.5L5 15.5M9.36459848 3.06028599C9.27736833 3.3228298 9.033005 3.49989311 8.75775352 3.5L4.99224648 3.5C4.716995 3.49989311 4.47263167 3.3228298 4.38540152 3.06028599L3.53309119 1.34600136C3.4677411 1.14989623 3.50033733.934139474 3.62065597.766403866 3.74097461.598668258 3.93427808.499499397 4.13993615.500001901L9.61006385.500001901C9.81572192.499499397 10.0090254.598668258 10.129344.766403866 10.2496627.934139474 10.2822589 1.14989623 10.2169088 1.34600136L9.36459848 3.06028599z"/>\
                <rect width="9" height="11" x="6.5" y="5.5" rx="1.5"/>\
                <path d="M9 8.5L13 8.5M9 10.5L13 10.5M9 12.5L11 12.5"/>\
              </g>\
            </svg>\
          ';
        case 'lefts':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="12" viewBox="0 0 19 12">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 -1)">\
                <path d="M17.32 10.748C17.32 11.5764271 16.67529 12.248 15.88 12.248M15.88 1.748C16.67529 1.748 17.32 2.41957288 17.32 3.248M5.72 3.248C5.72 2.41957288 6.36470996 1.748 7.16 1.748M7.16 12.248C6.36470996 12.248 5.72 11.5764271 5.72 10.748M17.5 6.248L17.5 7.748M0 7.5L6 7.5"/>\
                <polyline points="3 10.5 0 7.5 3 4.5"/>\
                <path d="M10 1.5L13 1.5M10 12.5L13 12.5"/>\
              </g>\
            </svg>\
          ';
        case 'sright':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="12" viewBox="0 0 19 12">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1 -1)">\
                <path d="M13.32 10.748C13.32 11.5764271 12.67529 12.248 11.88 12.248M19 7.5L13 7.5"/>\
                <polyline points="16 10.5 19 7.5 16 4.5"/>\
                <path d="M11.88 1.748C12.67529 1.748 13.32 2.41957288 13.32 3.248M1.72 3.248C1.72 2.41957288 2.36470996 1.748 3.16 1.748M3.16 12.248C2.36470996 12.248 1.72 11.5764271 1.72 10.748M1.5 6.248L1.5 7.748M6 1.5L9 1.5M6 12.5L9 12.5"/>\
              </g>\
            </svg>\
          ';
        case 'ret':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(1)">\
                <path d="M0,7.5 L7.5,7.5 C9.98528137,7.5 12,5.48528137 12,3 L12,0.747"/>\
                <polyline points="3.75 3.747 0 7.497 3.75 11.247"/>\
              </g>\
            </svg>\
          ';
        case 'left':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(1)">\
                <polyline points="5 10.5 0 5.5 5 .5"/>\
                <path d="M0,5.5 L10,5.5"/>\
              </g>\
            </svg>\
          ';
        case 'top':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="12" viewBox="0 0 11 12">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="rotate(-90 5.5 5.5)">\
                <polyline points="5 .5 10 5.5 5 10.5"/>\
                <path d="M10,5.5 L0,5.5"/>\
              </g>\
            </svg>\
          ';
        case 'right':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="translate(1)">\
                <polyline points="5 .5 10 5.5 5 10.5"/>\
                <path d="M10,5.5 L0,5.5"/>\
              </g>\
            </svg>\
          ';
        case 'bottom':
          return '\
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="12" viewBox="0 0 11 12">\
              <g fill="none" fill-rule="evenodd" stroke="#333" stroke-linecap="round" stroke-linejoin="round" transform="rotate(90 5 6)">\
                <polyline points="5 .5 10 5.5 5 10.5"/>\
                <path d="M10,5.5 L1.70530257e-13,5.5"/>\
              </g>\
            </svg>\
          ';
        default:
          return "";
        }
    };

    var add_control = function(content,fn){
        var e = elt("span",{"class":"guppy_osk_key "+content,"id":"guppy_osk_key_"+content},bottomIcon(content));
        click_listener(e, fn);
        controls.appendChild(e);
    }

    var add_custom_control = function(content,fn){
        var e = elt("span",{"class":"guppy_osk_key "+content,"id":"guppy_osk_key_"+content},bottomIcon(content));
        click_listener(e, fn);
        customs.appendChild(e);
    }

    var add_matrix_control = function(content,fn){
        var e = elt("span",{"class":"guppy_osk_key","id":"guppy_osk_key_"+content}, content);
        click_listener(e, fn);
        matrix_controls.appendChild(e);
        //katex.render(content, e);
    }

    add_control("undo", function(e){ e.preventDefault();guppy.engine.undo();guppy.render();});
    add_control("redo", function(e){ e.preventDefault();guppy.engine.redo();guppy.render();});
    add_control("null1", function(e) { guppy.render() });
    add_control("del", function(e){ e.preventDefault();guppy.engine.backspace();guppy.render();});
    add_control("null2", function(e) { guppy.render() });
    add_control("cut", function(e){ e.preventDefault();guppy.engine.sel_cut();guppy.render();});
    add_control("copy", function(e){ e.preventDefault();guppy.engine.sel_copy();guppy.render();});
    add_control("paste", function(e){ e.preventDefault();guppy.engine.sel_paste();guppy.render();});

    add_custom_control("lefts", function(e){ e.preventDefault();guppy.engine.sel_left();guppy.render();});
    add_custom_control("sright", function(e){ e.preventDefault();guppy.engine.sel_right();guppy.render();});
    add_custom_control("spc", function(e){ e.preventDefault();guppy.engine.spacebar();guppy.render();});
    // add_control("tab", function(e){ e.preventDefault();guppy.engine.tab();guppy.render();});
    add_custom_control("ret", function(e){ e.preventDefault();guppy.engine.done();guppy.render();});
    add_custom_control("null3", function(e) { guppy.render() });
    add_custom_control("left", function(e){ e.preventDefault();guppy.engine.left();guppy.render();});
    add_custom_control("top", function(e){ e.preventDefault();guppy.engine.up();guppy.render();});
    add_custom_control("bottom", function(e){ e.preventDefault();guppy.engine.down();guppy.render();});
    add_custom_control("right", function(e){ e.preventDefault();guppy.engine.right();guppy.render();});

    matrix_controls.appendChild(elt("br"));
    add_matrix_control("&larr;+col", function(e){ e.preventDefault();guppy.engine.list_extend_left();guppy.render();});
    add_matrix_control("+col&rarr;", function(e){ e.preventDefault();guppy.engine.list_extend_right();guppy.render();});
    add_matrix_control("&uarr;+row", function(e){ e.preventDefault();guppy.engine.list_extend_up();guppy.render();});
    add_matrix_control("&darr;+row", function(e){ e.preventDefault();guppy.engine.list_extend_down();guppy.render();});
    add_matrix_control("col&larr;col", function(e){ e.preventDefault();guppy.engine.list_extend_copy_left();guppy.render();});
    add_matrix_control("col&rarr;col", function(e){ e.preventDefault();guppy.engine.list_extend_copy_right();guppy.render();});
    add_matrix_control("row&uarr;row", function(e){ e.preventDefault();guppy.engine.list_extend_copy_up();guppy.render();});
    add_matrix_control("row&darr;row", function(e){ e.preventDefault();guppy.engine.list_extend_copy_down();guppy.render();});
    add_matrix_control("-col", function(e){ e.preventDefault();guppy.engine.list_remove();guppy.render();});
    add_matrix_control("-row", function(e){ e.preventDefault();guppy.engine.list_remove_row();guppy.render();});

    osk.appendChild(controls);
    osk.appendChild(customs);
    document.body.appendChild(osk);

    this.guppy = guppy;
    this.element = osk;
}

module.exports = GuppyOSK;
