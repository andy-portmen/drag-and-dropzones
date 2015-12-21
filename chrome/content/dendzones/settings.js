/* ***** BEGIN LICENSE BLOCK *****
Version: MPL 1.1/GPL 2.0/LGPL 2.1

The contents of this file are subject to the Mozilla Public License Version
1.1 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy of the License at
http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
for the specific language governing rights and limitations under the
License.

The Original Code is Web Search Pro code.

The Initial Developer of the Original Code is Martijn Kooij a.k.a. Captain Caveman.

Alternatively, the contents of this file may be used under the terms of
either the GNU General Public License Version 2 or later (the "GPL"), or
the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
in which case the provisions of the GPL or the LGPL are applicable instead
of those above. If you wish to allow use of your version of this file only
under the terms of either the GPL or the LGPL, and not to allow others to
use your version of this file under the terms of the MPL, indicate your
decision by deleting the provisions above and replace them with the notice
and other provisions required by the GPL or the LGPL. If you do not delete
the provisions above, a recipient may use your version of this file under
the terms of any one of the MPL, the GPL or the LGPL.

***** END LICENSE BLOCK ***** */

var {Services} = Components.utils.import('resource://gre/modules/Services.jsm');

/*DragDropItemObserver*/
var   DDIO =
{
	onDragStart: function (evt,transferData,action)
	{
		var oDZ = evt.target;
		if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
		var sData = oDZ.getAttribute("id");
		oDZ.setAttribute('dragstate', '1');
		transferData.data = new TransferData();
		transferData.data.addDataForFlavour("text/unicode", sData);
	}
};

/*DragDropSearchEngineItemObserver*/
var   DDSSIO =
{
	onDragStart: function (evt,transferData,action)
	{
        var oListbox = evt.target.parentNode;
        if (!oListbox || oListbox.nodeName != "listbox") return;

        var iSelectedIndex = oListbox.selectedIndex;
        if (iSelectedIndex == -1) return;

        transferData.data = new TransferData();
        transferData.data.addDataForFlavour(ENGINE_FLAVOR, "ss_" + iSelectedIndex.toString());
	}
};

/*DragDropContextMenuItemObserver*/
var   DDCMIO =
{
	onDragStart: function (evt,transferData,action)
	{
        var oListbox = evt.target.parentNode;
        if (!oListbox || oListbox.nodeName != "listbox") return;

        var iSelectedIndex = oListbox.selectedIndex;
        if (iSelectedIndex == -1) return;

        transferData.data = new TransferData();
        transferData.data.addDataForFlavour(ENGINE_FLAVOR, "cm_" + iSelectedIndex.toString());
	}
};

var   DenDZones_DragDropObserver =
{
	getSupportedFlavours : function ()
	{
		var oFS = new FlavourSet();
		oFS.appendFlavour("text/unicode");
		oFS.appendFlavour("text/x-moz-search-engine");
		return oFS;
	},

	onDragOver: function (evt,flavour,session)
	{
		var oDZs = document.getElementsByAttribute('class', 'dz');
		var oDZ;
		var iIndex, iLen = oDZs.length;

		for (iIndex = 0; iIndex < iLen; iIndex ++)
		{
			oDZs[iIndex].setAttribute('dragstate', '');
			if (oDZs[iIndex].getAttribute('dendid') == '') oDZs[iIndex].style.backgroundColor = "";
		}

		oDZ = session.sourceNode;
		if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
		if (oDZ.getAttribute('class') != "dz")
		{
			//Dragging a Search Engine.
			oDZ = evt.originalTarget;
			if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
			if (oDZ.getAttribute('class') == "dz")
			{
				oDZ.setAttribute('dragstate', '2');
				if (oDZ.getAttribute('selected') != 'true') oDZ.style.backgroundColor = document.getElementById('dropzonecolor').color;
				session.canDrop = true;
			}
		}
		else
		{
			//Dragging a zone.
			oDZ.setAttribute('dragstate', '1');

			oDZ = evt.originalTarget;
			if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
			oDZ.setAttribute('dragstate', '2');

			session.canDrop = true;
		}
		return session.canDrop;
	},

	onDrop: function (evt,dropdata,session)
	{
		if (dropdata.data && dropdata.data.substr(0, 3) == "dz_")
		{
			//Dropping a zone.
			var oDZs = document.getElementsByAttribute('class', 'dz');
			var oDZ;
			var sDroppedID;
			var sTargetID;
			var iIndex, iLen = oDZs.length;

			sDroppedID = dropdata.data;
			oDZ = evt.target;
			if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
			sTargetID = oDZ.getAttribute('id');

			DenDZones_DragSwitchDropZone(sDroppedID, sTargetID);

			for (iIndex = 0; iIndex < iLen; iIndex ++) {oDZs[iIndex].setAttribute('dragstate', '');}
		}
		else
		{
			var oDZ = evt.target;
			if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
			var sTargetID = oDZ.getAttribute('id');
			DenDZones_DragAssignDropZone(dropdata.data, sTargetID);

			for (iIndex = 0; iIndex < iLen; iIndex ++) {oDZs[iIndex].setAttribute('dragstate', '');}
		}
	}
};

var   DenDZones_DragDropRMItemObserver =
{
	getSupportedFlavours : function ()
	{
		var oFS = new FlavourSet();
		oFS.appendFlavour("text/unicode");
		return oFS;
	},

	onDragOver: function (evt,flavour,session)
	{
		session.canDrop = false;
		var oDZ;
		oDZ = session.sourceNode;
		if (oDZ.getAttribute('class') != "dz") oDZ = oDZ.parentNode;
		if (oDZ.getAttribute('class') == "dz")
		{
			if (evt.target && evt.target.nodeName && evt.target.nodeName.indexOf('tree') < 0)
			{
				session.canDrop = true;
			}
		}
		return session.canDrop;
	},

	onDrop: function (evt,dropdata,session)
	{
		if (dropdata.data && dropdata.data.substr(0, 3) == "dz_")
		{
			var sDroppedID = dropdata.data;
			DenDZones_DragRemoveDropZone(sDroppedID);

			var oDZs = document.getElementsByAttribute('class', 'dz');
			var iIndex, iLen = oDZs.length;
			for (iIndex = 0; iIndex < iLen; iIndex ++) {oDZs[iIndex].setAttribute('dragstate', '');}
		}
	}
};

function DenDZones_DropZoneDrop(oEvent)
{
	nsDragAndDrop.drop(oEvent, DenDZones_DragDropObserver);
}

function DenDZones_DropZoneDragOver(oEvent)
{
	nsDragAndDrop.dragOver(oEvent, DenDZones_DragDropObserver);
}

function DenDZones_DropZoneRMDrop(oEvent)
{
	nsDragAndDrop.drop(oEvent, DenDZones_DragDropRMItemObserver);
}

function DenDZones_DropZoneRMDragOver(oEvent)
{
	nsDragAndDrop.dragOver(oEvent, DenDZones_DragDropRMItemObserver);
}

function DenDZones_InitEngineManager()
{
	this.oDenDZones_Utils = new DenDUtils();
    this.gEngineView = (function () {
        if (typeof EngineView !== 'undefined' && typeof EngineStore !== 'undefined') {
            return new EngineView(new EngineStore());
        }
        return {
            _engineStore: {
                _engines: Services.search.getVisibleEngines()
            }
        }
    })();

    this.aCMItems = new Array();

	DenDZones_InitPrefs();
	DenDZones_InitDropZones(true);
	DenDZones_InitSearchEngines();
	DenDZones_InitCMItems();
	DenDZones_InitDropZones(false);

	document.getElementById("searchengines").addEventListener('dragover', DenDZones_DropZoneRMDragOver, false);
	document.getElementById("searchengines").addEventListener('dragdrop', DenDZones_DropZoneRMDrop, false);
	document.getElementById("cmitems").addEventListener('dragover', DenDZones_DropZoneRMDragOver, false);
	document.getElementById("cmitems").addEventListener('dragdrop', DenDZones_DropZoneRMDrop, false);
	document.getElementById("dropzonebox").addEventListener('dragover', DenDZones_DropZoneDragOver, false);
	document.getElementById("dropzonebox").addEventListener('dragdrop', DenDZones_DropZoneDrop, false);

    document.getElementById("dropzonebox").setAttribute("maxaxis", this.oDenDZones_Utils.GetInt("maxaxis"));

    this.sizeToContent();
}

function DenDZones_DeInitEngineManager(bAndSave)
{
    if (document.documentElement.getButton("accept").hidden) bAndSave = true;
    if (bAndSave)
    {
        DenDZones_SaveDropZones();
    }

	var oObService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	oObService.notifyObservers(opener, "dendzones-apply-settings", "OK");
    return 1;
}

function DenDZones_SaveDropZones()
{
    var oDZs = document.getElementsByAttribute('class', 'dz');
    var sDZID, sLabel, sCommand, sImage, sColor;
    var iIndex, iLen, iX, iY;

    this.aDenDZones_DropZones = null;
    this.aDenDZones_DropZones = new Array(10);
    for (iIndex = 0; iIndex < 10; iIndex ++) this.aDenDZones_DropZones[iIndex] = new Array(10);

    iLen = oDZs.length;
    for (iIndex = 0; iIndex < iLen; iIndex ++)
    {
        sDZID = oDZs[iIndex].getAttribute('dendid');
        if (sDZID && sDZID != "")
        {
            sLabel = oDZs[iIndex].getAttribute('dendlabel');
            sCommand = oDZs[iIndex].getAttribute('dendcommand');
            sImage = oDZs[iIndex].firstChild.getAttribute('src');
            sColor = oDZs[iIndex].style.backgroundColor;
            iX = parseInt(oDZs[iIndex].getAttribute('id').substr(3, 1));
            iY = parseInt(oDZs[iIndex].getAttribute('id').substr(5, 1));
            this.aDenDZones_DropZones[iX][iY] = new Array(sDZID, sLabel, sCommand, sImage, sColor);
        }
    }
    this.oDenDZones_Utils.SetDropZones(this.aDenDZones_DropZones);
}

function DenDZones_InitPrefs()
{
	this.oDenDZones_Color = document.getElementById('dropzonecolor');

	if (this.oDenDZones_Color.mPicker) //Does not exist if you have Rainbowpicker installed. Not sure if this should be my problem, but my extension does not work otherwise...
	{
		//Add the Captain Caveman color...
		this.oDenDZones_Color.mPicker.mBox.lastChild.lastChild.style.backgroundColor = "#6487DC";
		this.oDenDZones_Color.mPicker.mBox.lastChild.lastChild.style.color = "#6487DC";
		this.oDenDZones_Color.mPicker.mBox.lastChild.lastChild.setAttribute('color', '#6487DC');
	}
}

function DenDZones_InitSearchEngines()
{
    var oList = document.getElementById("searchengines");
    var oEngine;
    var oItem;
    var sExtraStyle = "";

    for each(oEngine in gEngineView._engineStore._engines)
    {
        oItem = oList.appendItem(oEngine.name, oEngine.name);
        oItem.value = oEngine.name;
        oItem.addEventListener("draggesture", function(event) {nsDragAndDrop.startDrag(event, DDSSIO);});
        oItem.setAttribute("tooltiptext", oEngine.description);
        oItem.setAttribute("class", "listitem-iconic");
        sExtraStyle = "";
        if (HasDropZone(oEngine.name)) sExtraStyle = " color: rgb(100,135,220);";
        if (oEngine.iconURI)
        {
            oItem.setAttribute("icon", oEngine.iconURI.spec);
            oItem.setAttribute("style", "list-style-image: url('" + oEngine.iconURI.spec + "');" + sExtraStyle);
        }
        else
        {
            oItem.setAttribute("icon", "");
            oItem.setAttribute("style", "list-style-image: none;" + sExtraStyle);
        }
    }
}

function DenDZones_InitCMItems()
{
    var oBrowser;
    var oList = document.getElementById("cmitems");
    var iIndex, iLen;

    var oBrowser;
    var oWindowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var oBrowserWindow = oWindowMediator.getMostRecentWindow("navigator:browser");
    if (oBrowserWindow) oBrowser = oBrowserWindow.getBrowser();
    if (!oBrowser)
    {
        if (typeof(opener.getBrowser) == "function") oBrowser = opener.getBrowser();
        else
        {
            if (!opener.opener) oBrowser = opener.top.document.getElementById("content");
            else if (typeof(opener.opener.getBrowser) == "function") oBrowser = opener.opener.getBrowser();
        }
    }
    if (oBrowser)
    {
        var oContextMenu = oBrowser.ownerDocument.getElementById('contentAreaContextMenu');
        this.aCMItems = null;
        this.aCMItems = new Array();
        DenDZones_AddCMItems(oContextMenu, "");
        this.aCMItems.sort(DenDZones_SortCMItems);
        DenDZones_DisplayCMItems();
    }
}

function DenDZones_AddCMItems(oParentNode, sParentLabel)
{
    if (oParentNode && (oParentNode.nodeName == "popup" || oParentNode.nodeName == "menu" || oParentNode.nodeName == "menuitem" || oParentNode.nodeName == "menupopup"))
    {
        var oList = document.getElementById("cmitems");
        var oCMItem, oLItem;
        var oStyle;
        var sLabel, sTooltip, sID, sCommand, sImage;
        var iIndex;
        var bFoundSomething;

        if (!sParentLabel) sParentLabel = "";

        for each(oCMItem in oParentNode.childNodes)
        {
            bFoundSomething = false;
            if (typeof(oCMItem.getAttribute) == "function")
            {
                sLabel = oCMItem.label;
                if (!sLabel) sLabel = oCMItem.getAttribute("tooltiptext");
                if (sLabel && sLabel != "" && (oCMItem.getAttribute('command') != "" || oCMItem.getAttribute('oncommand') != ""))
                {
                    sID = oCMItem.id;
                    if (!sID || sID == "") sID = sLabel;
                    sTooltip = sLabel;
                    if (sParentLabel && sParentLabel != "") sTooltip = sParentLabel + " - " + sTooltip;
                    sCommand = oCMItem.getAttribute("command");
                    if (!sCommand || sCommand == "") sCommand = oCMItem.getAttribute("oncommand");
                    iIndex = this.aCMItems.length;

                    sImage = "";
                    try {
                        sImage = oCMItem.getAttribute("fseicon");
                    } catch (e) {sImage = "";}
                    if (sImage == "") {
                        try {
                            sImage = oCMItem.childNodes[0].src;
                        } catch (e) {sImage = "";}
                    }
                    if (sImage == "") {
                        try {
                            sImage = oCMItem.getAttribute("image");
                        } catch (e) {sImage = "";}
                    }
                    if (sImage == "") {
                        try {
                            sImage = oCMItem.childNodes[0].childNodes[0].src;
                        } catch (e) {sImage = "";}
                    }
                    if (sImage == "") {
                        try {
                            oStyle = oCMItem.ownerDocument.defaultView.getComputedStyle(oCMItem, null);
                            sImage = oStyle.getPropertyValue("list-style-image");
                        } catch (e) {sImage = "";}
                    }
                    if (!sImage || sImage == "" || sImage == "none") {
                        sImage = "chrome://dendzones/skin/context_menu_action.png";
                    }
                    else {
                        sImage = sImage.replace('url("', '').replace('")', '');
                    }
                    this.aCMItems[iIndex] = new Array(sID, sLabel, sTooltip, sCommand, sImage);

                    DenDZones_AddCMItems(oCMItem, sTooltip);
                    bFoundSomething = true;
                }
            }
            if (!bFoundSomething)
            {
                if (oCMItem)
                {
                    if (oCMItem.label && oCMItem.label != "" && sParentLabel && sParentLabel != "") sTooltip = sParentLabel + " - " + oCMItem.label;
                    else if (oCMItem.label && oCMItem.label != "") sTooltip = oCMItem.label;
                    else sTooltip = sParentLabel;

                    DenDZones_AddCMItems(oCMItem, sTooltip);
                }
            }
        }
    }
}

function DenDZones_DisplayCMItems()
{
    var oList = document.getElementById("cmitems");
    var oLItem;
    var sExtraStyle = "";
    var iIndex, iLen = this.aCMItems.length;

    for (iIndex = 0; iIndex < iLen; iIndex ++)
    {
        sExtraStyle = "";
        if (HasDropZone(this.aCMItems[iIndex][0])) sExtraStyle = " color: rgb(100,135,220);";
        oLItem = oList.appendItem(this.aCMItems[iIndex][1], this.aCMItems[iIndex][0]);
        oLItem.setAttribute("dendlabel", this.aCMItems[iIndex][1]);
        oLItem.setAttribute("dendcommand", this.aCMItems[iIndex][3]);
        oLItem.addEventListener("draggesture", function(event) {nsDragAndDrop.startDrag(event, DDCMIO);});
        oLItem.setAttribute("tooltiptext", this.aCMItems[iIndex][2]);
        oLItem.setAttribute("class", "listitem-iconic");
        oLItem.setAttribute("icon", this.aCMItems[iIndex][4]);
        oLItem.setAttribute("style", "list-style-image: url('" + this.aCMItems[iIndex][4] + "');" + sExtraStyle);
    }
}

function DenDZones_SortCMItems(a1, a2)
{
	if (a1[1] < a2[1]) return -1;
	return 1;
}

function DenDZones_InitDropZones(bDataOnly)
{
	this.aDenDZones_DropZones = null;
	this.aDenDZones_DropZones = this.oDenDZones_Utils.GetDropZones();

	if (!bDataOnly) setTimeout(function() {DenDZones_InitDropZonesUI();}, 100);
}

function DenDZones_InitDropZonesUI()
{
	var oDZ;
	var oItem;
	var sID, sLabel, sFavIcon;
	var iFSEIndex, iIndex, iLen = this.aDenDZones_DropZones.length;
	var iX, iY;

	for (iX = 0; iX < 10; iX ++)
	{
		for (iY = 0; iY < 10; iY ++)
		{
            if (this.aDenDZones_DropZones[iX][iY][0] == "")
            {
			    oDZ = document.getElementById('dz_' + iX + '_' + iY);
			    oDZ.setAttribute('dendid', '');
                oDZ.setAttribute('dendlabel', '');
                oDZ.setAttribute('dendcommand', '');
			    oDZ.setAttribute('selected', false);
                oDZ.addEventListener('click', function() {DenDZones_SetColor(this);});
                oDZ.firstChild.setAttribute('tooltiptext', '');
			    oDZ.firstChild.setAttribute('src', '');
                oDZ.style.backgroundColor = "";
            }
            else
            {
		        oDZ = document.getElementById('dz_' + iX + '_' + iY);
		        oItem = DenDZones_GetListboxItemByValue(this.aDenDZones_DropZones[iX][iY][0]);
		        if (oItem)
		        {
			        oDZ.setAttribute('dendid', oItem.value);
                    oDZ.setAttribute('dendlabel', oItem.label);
                    oDZ.setAttribute('dendcommand', oItem.getAttribute('dendcommand'));
			        oDZ.setAttribute('tooltiptext', oItem.getAttribute('tooltiptext'));
			        oDZ.setAttribute('selected', true);
                    oDZ.addEventListener('click', function() {DenDZones_SetColor(this);});
			        oDZ.firstChild.setAttribute('tooltiptext', oItem.getAttribute('tooltiptext'));
			        oDZ.firstChild.setAttribute('src', oItem.getAttribute('icon'));
                    oDZ.style.backgroundColor = this.aDenDZones_DropZones[iX][iY][4];
		        }
                else
                {
                    oDZ.setAttribute('dendid', this.aDenDZones_DropZones[iX][iY][0]);
                    oDZ.setAttribute('dendlabel', this.aDenDZones_DropZones[iX][iY][1]);
                    oDZ.setAttribute('dendcommand', this.aDenDZones_DropZones[iX][iY][2]);
                    oDZ.setAttribute('tooltiptext', this.aDenDZones_DropZones[iX][iY][1]);
                    oDZ.setAttribute('selected', true);
                    oDZ.addEventListener('click', function() {DenDZones_SetColor(this);});
                    oDZ.firstChild.setAttribute('tooltiptext', this.aDenDZones_DropZones[iX][iY][1]);
                    oDZ.firstChild.setAttribute('src', this.aDenDZones_DropZones[iX][iY][3]);
                    oDZ.style.backgroundColor = this.aDenDZones_DropZones[iX][iY][4]
                }
            }
		}
	}
}

function DenDZones_GetListboxItemByValue(sValue)
{
    var oList, oItem;
    var iIndex, iLen

    oList = document.getElementById('searchengines');
    iLen = oList.getRowCount();
    for (iIndex = 0; iIndex < iLen; iIndex ++)
    {
        oItem = oList.getItemAtIndex(iIndex);
        if (oItem.value == sValue) return oItem;
    }
    oList = document.getElementById('cmitems');
    iLen = oList.getRowCount();
    for (iIndex = 0; iIndex < iLen; iIndex ++)
    {
        oItem = oList.getItemAtIndex(iIndex);
        if (oItem.value == sValue) return oItem;
    }

    return null;
}

function DenDZones_DragAssignDropZone(sIndex, sTargetID)
{
    var oList, oItem;
    var sType = sIndex.substr(0, 2);
    var iIndex = parseInt(sIndex.substr(3));

    if (iIndex < 0 || isNaN(iIndex)) return;

    if (sType == "ss") oList = document.getElementById('searchengines');
    else if (sType == "cm") oList = document.getElementById('cmitems');

    if (iIndex > oList.getRowCount()) return;
    oItem = oList.getItemAtIndex(iIndex);

    if (!oItem) return;

    var oDZ = document.getElementById(sTargetID);
    if (oDZ)
    {
        oDZ.setAttribute('dendid', oItem.value);
        oDZ.setAttribute('dendlabel', oItem.label);
        oDZ.setAttribute('dendcommand', oItem.getAttribute('dendcommand'));
        oDZ.setAttribute('tooltiptext', oItem.getAttribute('tooltiptext'));
        oDZ.setAttribute('selected', true);
        oDZ.firstChild.setAttribute('tooltiptext', oItem.getAttribute('tooltiptext'));
        oDZ.firstChild.setAttribute('src', oItem.getAttribute('icon'));
        oDZ.style.backgroundColor = this.oDenDZones_Color.color;
    }
}

function DenDZones_SetColor(oDZ)
{
    if (oDZ)
    {
        if (oDZ.getAttribute("selected") == "true") oDZ.style.backgroundColor = this.oDenDZones_Color.color;
        else oDZ.style.backgroundColor = "";
    }
}

function DenDZones_DragSwitchDropZone(sSourceID, sTargetID)
{
	var oSource = document.getElementById(sSourceID);
	var oTarget = document.getElementById(sTargetID);

	if (oSource && oTarget && sSourceID != sTargetID)
	{
		var sSID = oSource.getAttribute('dendid');
		var sSLabel = oSource.getAttribute('dendlabel');
		var sSCommand = oSource.getAttribute('dendcommand');
		var sSTooltiptext = oSource.getAttribute('tooltiptext');
		var sSSRC = oSource.firstChild.getAttribute('src');
		var sSSelected = oSource.getAttribute('selected');
		var sSColor = oSource.style.backgroundColor;

		var sTID = oTarget.getAttribute('dendid');
		var sTLabel = oTarget.getAttribute('dendlabel');
		var sTCommand = oTarget.getAttribute('dendcommand');
		var sTTooltiptext = oTarget.getAttribute('tooltiptext');
		var sTSRC = oTarget.firstChild.getAttribute('src');
		var sTSelected = oTarget.getAttribute('selected');
		var sTColor = oTarget.style.backgroundColor;

        if (sTargetID != "dropzonebox")
        {
    		oSource.setAttribute('dendid', sTID);
    		oSource.setAttribute('dendlabel', sTLabel);
    		oSource.setAttribute('dendcommand', sTCommand);
    		oSource.setAttribute('tooltiptext', sTTooltiptext);
    		oSource.setAttribute('selected', sTSelected);
    		oSource.firstChild.setAttribute('tooltiptext', sTTooltiptext);
    		oSource.firstChild.setAttribute('src', sTSRC);
            oSource.style.backgroundColor = sTColor;

    		oTarget.setAttribute('dendid', sSID);
    		oTarget.setAttribute('dendlabel', sSLabel);
    		oTarget.setAttribute('dendcommand', sSCommand);
    		oTarget.setAttribute('tooltiptext', sSTooltiptext);
    		oTarget.setAttribute('selected', sSSelected);
    		oTarget.firstChild.setAttribute('tooltiptext', sSTooltiptext);
    		oTarget.firstChild.setAttribute('src', sSSRC);
            oTarget.style.backgroundColor = sSColor;
        }
        else
        {
    		oSource.setAttribute('dendid', '');
    		oSource.setAttribute('dendlabel', '');
    		oSource.setAttribute('dendcommand', '');
    		oSource.setAttribute('tooltiptext', '');
    		oSource.setAttribute('selected', false);
    		oSource.firstChild.setAttribute('tooltiptext', '');
    		oSource.firstChild.setAttribute('src', '');
            oSource.style.backgroundColor = "";
        }
	}
}

function DenDZones_DragRemoveDropZone(sSourceID)
{
	var oSource = document.getElementById(sSourceID);
	if (oSource)
	{
		oSource.setAttribute('dendid', '');
		oSource.setAttribute('dendlabel', '');
		oSource.setAttribute('dendcommand', '');
		oSource.setAttribute('tooltiptext', '');
		oSource.setAttribute('selected', false);
		oSource.firstChild.setAttribute('tooltiptext', '');
		oSource.firstChild.setAttribute('src', '');
        oSource.style.backgroundColor = "";
	}
}

function ValidateOpacity(oPreference)
{
    var iValue = parseInt(oPreference.value);
    if (isNaN(iValue) || iValue < 0 || iValue > 1) oPreference.reset();
}

function UpdateDZMaxAxis(oPreference)
{
    document.getElementById("dropzonebox").setAttribute("maxaxis", oPreference.value);
}

function HasDropZone(sID)
{
	var iX, iY;

	for (iX = 0; iX < 10; iX ++)
	{
		for (iY = 0; iY < 10; iY ++)
		{
            if (this.aDenDZones_DropZones[iX][iY][0] == sID) return true;
        }
    }
    return false;
}
