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

The Original Code is Drag & DropZone Searching code.

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

var DenDZonesShell =
{
    DenDZones_PreInit: function()
    {
        if (!this.oDenDZones_Utils && !this.bDenDZones_Initializing)
        {
            this.bDenDZones_Initializing = true;
            setTimeout(function() {DenDZonesShell.DenDZones_Init();}, 500);
        }
    },

    DenDZones_Init: function()
    {
        if (!this.oDenDZones_Utils)
        {
            this.oDenDZones_Observer =
            {
                observe: function(subject, topic, state)
                {
                    if (topic == "dendzones-apply-settings" && state == 'OK') if (this && typeof(DenDZonesShell.DenDZones_InitDropZones) == "function")
                    {
                        DenDZonesShell.DenDZones_RegisterStyleSheet();
                        DenDZonesShell.DenDZones_InitDropZones();
                        DenDZonesShell.DenDZones_UpdateToggleDenDButton();
                    }
                }
            };

            this.oDenDZones_Utils = new DenDUtils();
            this.oMouseObject = {oNode: null, oOriginalEvent: null, sHoverText: ""};

            this.aDenDZones_DropZones = null;
            this.aDenDZones_FadeOutDropZones = new Array();

            this.iDenDZones_DropZoneMaxAxis = this.oDenDZones_Utils.GetInt("maxaxis");
            this.iDenDZones_LastHighlightedDropZoneX = -1;
            this.iDenDZones_LastHighlightedDropZoneY = -1;

            this.iDenDZones_LastDragTime = 0;

            this.bMouseDragActive = false;

            DenDZonesShell.DenDZones_InitDropZones();
            DenDZonesShell.DenDZones_UpdateToggleDenDButton();

            if (this.oDenDZones_Utils.GetBool("dendzoneson"))
            {
                getBrowser().mPanelContainer.addEventListener('dragover', DenDZonesShell.DenDZones_DragOver, true);
                getBrowser().mPanelContainer.addEventListener('dragdrop', DenDZonesShell.DenDZones_Drop, true);
                getBrowser().mPanelContainer.addEventListener('drop', DenDZonesShell.DenDZones_Drop, true);
                getBrowser().mPanelContainer.addEventListener('dragexit', DenDZonesShell.DenDZones_DragDropExit, true);
                getBrowser().mPanelContainer.addEventListener('click', DenDZonesShell.DenDZones_Click, true);
                getBrowser().mPanelContainer.addEventListener('mousemove', DenDZonesShell.DenDZones_MouseMove, true);
                getBrowser().mPanelContainer.addEventListener("keyup", DenDZonesShell.HandleKeyUp, false);
            }

            var oObService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService)
            oObService.addObserver(DenDZonesShell.oDenDZones_Observer, "dendzones-apply-settings", false);

            //Welcome page
            (function () {
                function welcome(version) {
                    if (DenDZonesShell.oDenDZones_Utils.GetString("version") == version)
                    {
                        return;
                    }
                    //Showing welcome screen
                    setTimeout(function ()
                    {
                        var newTab = getBrowser().addTab("http://firefox.add0n.com/drag-and-dropzones.html?version=" + version);
                        getBrowser().selectedTab = newTab;
                    }, 5000);
                    DenDZonesShell.oDenDZones_Utils.SetString("version", version);
                }

                Components.utils.import("resource://gre/modules/AddonManager.jsm");
                AddonManager.getAddonByID("dendzones@captaincaveman.nl", function (addon) {
                    welcome(addon.version);
                });
            })();

        }
    },

    DenDZones_DeInit: function()
    {
        try
        {
            var oObService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService)
            oObService.removeObserver(DenDZonesShell.oDenDZones_Observer, "dendzones-apply-settings");
            DenDZonesShell.oDenDZones_Observer = null;
        } catch (e) {}
    },

    DenDZones_RegisterStyleSheet: function()
    {
        window.removeEventListener("load", DenDZonesShell.DenDZones_RegisterStyleSheet, true);

        var oUtils = new DenDUtils();
        var oSSS = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
        var oIOService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var sStyle = "";

        sStyle += ".dropzone {background: transparent !important; border: 1px solid rgba(62,79,119,.8) !important; position: absolute !important; font: 10pt verdana !important; z-index: 2001 !important;} ";
        sStyle += ".dropzone img {margin-top: 3px !important; vertical-align: middle !important; padding-left: 3px !important; padding-right: 3px !important; max-height: 16px !important; max-width: 16px !important; border: none !important;} ";

        var oURI = oIOService.newURI("data:text/css," + sStyle, null, null);
        try
        {
            if(oSSS.sheetRegistered(oURI, oSSS.USER_SHEET)) oSSS.unregisterSheet(oURI, oSSS.USER_SHEET);
            if(!oSSS.sheetRegistered(oURI, oSSS.USER_SHEET)) oSSS.loadAndRegisterSheet(oURI, oSSS.USER_SHEET);
        } catch (e) {oUtils.WriteDebugMessage("Error applying new style, please restart Firefox.");}
    },

    DenDZones_ToggleDenD: function()
    {
        this.oDenDZones_Utils.SetBool("dendzoneson", !this.oDenDZones_Utils.GetBool("dendzoneson"));
        if (this.oDenDZones_Utils.GetBool("dendzoneson"))
        {
            getBrowser().mPanelContainer.addEventListener('dragover', DenDZonesShell.DenDZones_DragOver, true);
            getBrowser().mPanelContainer.addEventListener('dragdrop', DenDZonesShell.DenDZones_Drop, true);
            getBrowser().mPanelContainer.addEventListener('drop', DenDZonesShell.DenDZones_Drop, true);
            getBrowser().mPanelContainer.addEventListener('dragexit', DenDZonesShell.DenDZones_DragDropExit, true);
            getBrowser().mPanelContainer.addEventListener('click', DenDZonesShell.DenDZones_Click, true);
            getBrowser().mPanelContainer.addEventListener('mousemove', DenDZonesShell.DenDZones_MouseMove, true);
            getBrowser().mPanelContainer.addEventListener("keyup", DenDZonesShell.HandleKeyUp, true);
        }
        else
        {
            getBrowser().mPanelContainer.removeEventListener('dragover', DenDZonesShell.DenDZones_DragOver, true);
            getBrowser().mPanelContainer.removeEventListener('dragdrop', DenDZonesShell.DenDZones_Drop, true);
            getBrowser().mPanelContainer.removeEventListener('drop', DenDZonesShell.DenDZones_Drop, true);
            getBrowser().mPanelContainer.removeEventListener('dragexit', DenDZonesShell.DenDZones_DragDropExit, true);
            getBrowser().mPanelContainer.removeEventListener('click', DenDZonesShell.DenDZones_Click, true);
            getBrowser().mPanelContainer.removeEventListener('mousemove', DenDZonesShell.DenDZones_MouseMove, true);
            getBrowser().mPanelContainer.removeEventListener("keyup", DenDZonesShell.HandleKeyUp, true);
        }

        DenDZonesShell.DenDZones_UpdateToggleDenDButton();
    },

    DenDZones_OpenSettings: function()
    {
        window.open("chrome://dendzones/content/settings.xul", "", "chrome,titlebar,toolbar,centerscreen,resizable", this);
    },

    DenDZones_UpdateToggleDenDButton: function()
    {
        var oTBButton = document.getElementById('DenDZonesToggleDenD');
        if (oTBButton) oTBButton.setAttribute('dendon', this.oDenDZones_Utils.GetBool("dendzoneson"));
    },

    DenDZones_DragDropObserver:
    {
        getSupportedFlavours : function ()
        {
            var oFS = new FlavourSet();
            oFS.appendFlavour("text/unicode");
            oFS.appendFlavour("text/x-moz-url");
            return oFS;
        },

        onDragOver: function (evt,flavour,session)
        {
            var bHandled = false;
            DenDZonesShell.DenDZones_StoreMousePos(evt);

            if (session.isDataFlavorSupported("text/unicode") || session.isDataFlavorSupported("text/x-moz-url") || session.sourceNode.nodeName == "IMG")
            {
                if (!DenDZonesShell.GetDragUseDropZones() || DenDZonesShell.GetDragUseDropZones() == 0)
                {
                    DenDZonesShell.SetDragUseDropZones(-1);
                    var bIsURI = false;
                    try
                    {
                        var privacyContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsILoadContext);
                        var oTrans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
                        if ('init' in oTrans) oTrans.init(privacyContext);

                        var oUnicode;
                        var aData = {};
                        var aLength = {};

                        try
                        {
                            oTrans.addDataFlavor("text/x-moz-url");
                            session.getData(oTrans, 0);
                            oTrans.getTransferData("text/x-moz-url", aData, aLength);
                        }
                        catch (e)
                        {
                            oTrans.addDataFlavor("text/unicode");
                            session.getData(oTrans, 0);
                            oTrans.getTransferData("text/unicode", aData, aLength);
                        }
                        oUnicode = aData.value.QueryInterface(Components.interfaces.nsISupportsString);
                        sData = oUnicode.data.substring(0, aLength.value / 2);

                        var oIOS = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
                        var oURI = oIOS.newURI(sData,null,null);
                        oURI.host; //Will fail if it's not a URI...
                        bIsURI = true;
                    }
                    catch (e) {bIsURI = false;}

                    if ((sData && sData != "") || session.sourceNode.nodeName == "IMG")
                    {
                        DenDZonesShell.SetDragUseDropZones(1);
                    }
                    else
                    {
                        session.canDrop = true;
                        bHandled = true;
                        DenDZonesShell.SetDragUseDropZones(2);
                    }
                }
                else if (DenDZonesShell.GetDragUseDropZones() == 1)
                {
                    if (!DenDZonesShell.GetDragInitialized())
                    {
                        DenDZonesShell.DenDZones_UpdateDropZones('show');
                        DenDZonesShell.DenDZones_CheckDZStillDragging();
                        DenDZonesShell.SetDragInitialized(true);
                    }
                    DenDZonesShell.DenDZones_UpdateDropZones('highlight', evt);
                    session.canDrop = true;
                    bHandled = true;
                }
                else if (DenDZonesShell.GetDragUseDropZones() == 2)
                {
                    session.canDrop = true;
                    bHandled = true;
                }
            }

            if (bHandled)
            {
                evt.stopPropagation();
                evt.preventDefault();
            }

            return session.canDrop;
        },

        onDrop: function (evt,dropdata,session)
        {
            var privacyContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsILoadContext);
            var oTrans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
            if ('init' in oTrans) oTrans.init(privacyContext);
            var oUnicode;
            var aData = {};
            var aLength = {};
            var sData = "";

            try
            {
                oTrans.addDataFlavor("text/x-moz-url");
                session.getData(oTrans, 0);
                oTrans.getTransferData("text/x-moz-url", aData, aLength);
                oUnicode = aData.value.QueryInterface(Components.interfaces.nsISupportsString);
                sData = oUnicode.data.substring(0, aLength.value / 2);
                sData = DenDZonesShell.GetURISource(sData);
                if (!sData) sData = "";
            }
            catch (e) {sData = "";}
            if (sData == "")
            {
                try
                {
                    oTrans.addDataFlavor("text/unicode");
                    session.getData(oTrans, 0);
                    oTrans.getTransferData("text/unicode", aData, aLength);
                    oUnicode = aData.value.QueryInterface(Components.interfaces.nsISupportsString);
                    sData = oUnicode.data.substring(0, aLength.value / 2);
                }
                catch (e) {sData = transferUtils.retrieveURLFromData(dropdata.data, dropdata.flavour.contentType);}
            }

            var bHandled = false;
            if (DenDZonesShell.DenDZones_DragDropDZSearch(sData, evt.clientX, evt.clientY, evt.target.id, session.sourceNode, null, evt))
            {
                session.canDrop = true;
                bHandled = true;
            }

            if (bHandled) {
                evt.stopPropagation();
                evt.preventDefault();
            }

            DenDZonesShell.DenDZones_UpdateDropZones('destroy');
            DenDZonesShell.SetDragInitialized(false);
            DenDZonesShell.SetDragUseDropZones(0);

            return bHandled;
        },

        onDragExit: function (evt,session)
        {
            if (session.sourceNode && session.sourceNode.localName == "tab")
            {
                return true;
            }

            if (DenDZonesShell.DenDZones_CheckDropZonesExit(evt))
            {
                DenDZonesShell.SetDragInitialized(false);
                DenDZonesShell.SetDragUseDropZones(0);
            }
            return true;
        }
    },

    DenDZones_Click: function(oEvent)
    {
        if (!DenDZonesShell.bMouseDragActive)
        {
            if ((oEvent.ctrlKey && oEvent.shiftKey && DenDZonesShell.oDenDZones_Utils.GetBool("activateonctrlshiftclick")) || (!oEvent.shiftKey && DenDZonesShell.oDenDZones_Utils.GetBool("handlecontextclick") && oEvent.button == 2))
            {
                DenDZonesShell.oMouseObject.oNode = oEvent.target;
                DenDZonesShell.oMouseObject.oOriginalEvent = oEvent;

                var sText = DenDZonesShell.GetSelectedText();
                if (!sText || sText == "") {
                    if (oEvent.rangeParent.nodeType == document.TEXT_NODE) {
                        sText = DenDZonesShell.GetHoverText(oEvent, oEvent.rangeParent.data, oEvent.rangeOffset);
                    }
                }
                DenDZonesShell.oMouseObject.sHoverText = sText;

                var iResult = DenDZonesShell.DenDZones_HandleThisDenDOperation(oEvent, null, DenDZonesShell.oMouseObject.sHoverText);
                var iResult2 = DenDZonesShell.DenDZones_CheckDZHandlesThisDrag(oEvent);
                /*Allow -1 since it's the SHIFT disable key...*/
                if ((iResult == -1 || iResult == 1 || iResult == 2 || iResult == 3) && (iResult2 == -1 || iResult2 == 1))
                {
                    DenDZonesShell.bMouseDragActive = true;
                    DenDZonesShell.DenDZones_StoreMousePos(oEvent);
                    DenDZonesShell.SetDragUseDropZones(1);
                    if (!DenDZonesShell.GetDragInitialized())
                    {
                        DenDZonesShell.DenDZones_UpdateDropZones('show');
                        DenDZonesShell.DenDZones_CheckDZStillDragging();
                        DenDZonesShell.SetDragInitialized(true);
                    }
                    oEvent.stopPropagation();
                    oEvent.preventDefault();
                }
            }
        }
        else if (oEvent.button == 0)
        {
            oEvent.stopPropagation();
            oEvent.preventDefault();
            DenDZonesShell.DenDZones_NoDragDenDSearch(oEvent);
        }
        else
        {
            oEvent.stopPropagation();
            oEvent.preventDefault();
            DenDZonesShell.DenDZones_UpdateDropZones('destroy');
            DenDZonesShell.SetDragInitialized(false);
            DenDZonesShell.SetDragUseDropZones(0);
            DenDZonesShell.bMouseDragActive = false;
            DenDZonesShell.oMouseObject.oNode = null;
            DenDZonesShell.oOriginalEvent = null;
            DenDZonesShell.oMouseObject.sHoverText = "";
        }
    },

    DenDZones_MouseMove: function(oEvent)
    {
        if (DenDZonesShell.bMouseDragActive)
        {
            if (DenDZonesShell.iDenDZones_LastDragTime == 0) DenDZonesShell.iDenDZones_LastDragTime = new Date().getTime();

            var iResult = DenDZonesShell.DenDZones_HandleThisDenDOperation(oEvent, null, DenDZonesShell.oMouseObject.sHoverText);
            var iResult2 = DenDZonesShell.DenDZones_CheckDZHandlesThisDrag(oEvent);

            /*Allow -1 since it's the SHIFT disable key...*/
            if ((iResult == -1 || iResult == 1 || iResult == 2 || iResult == 3) && iResult2 == 1)
            {
                DenDZonesShell.bMouseDragActive = true;
            }

            if (DenDZonesShell.bMouseDragActive)
            {
                DenDZonesShell.DenDZones_StoreMousePos(oEvent);
                DenDZonesShell.SetDragUseDropZones(1);
                if (!DenDZonesShell.GetDragInitialized())
                {
                    DenDZonesShell.DenDZones_UpdateDropZones('show');
                    DenDZonesShell.DenDZones_CheckDZStillDragging();
                    DenDZonesShell.SetDragInitialized(true);
                }
                DenDZonesShell.DenDZones_UpdateDropZones('highlight', oEvent);
            }
        }
        else
        {
            DenDZonesShell.oMouseObject.oNode = oEvent.target;
            DenDZonesShell.oMouseObject.oOriginalEvent = oEvent;

            var sText = DenDZonesShell.GetSelectedText();
            if (!sText || sText == "") {
                if (oEvent.rangeParent.nodeType == document.TEXT_NODE) {
                    sText = DenDZonesShell.GetHoverText(oEvent, oEvent.rangeParent.data, oEvent.rangeOffset);
                }
            }
            DenDZonesShell.oMouseObject.sHoverText = sText;
        }
    },

    DenDZones_NoDragDenDSearch: function(oEvent)
    {
        DenDZonesShell.DenDZones_DragDropDZSearch(DenDZonesShell.oMouseObject.sHoverText, oEvent.clientX, oEvent.clientY, oEvent.target.id, DenDZonesShell.oMouseObject.oNode, DenDZonesShell.oMouseObject, oEvent);

        DenDZonesShell.DenDZones_UpdateDropZones('destroy');
        DenDZonesShell.SetDragInitialized(false);
        DenDZonesShell.SetDragUseDropZones(0);
        DenDZonesShell.bMouseDragActive = false;
        DenDZonesShell.oMouseObject.oNode = null;
        DenDZonesShell.oMouseObject.oOriginalEvent = null;
        DenDZonesShell.oMouseObject.sHoverText = "";
    },

    HandleKeyUp: function(oEvent)
    {
        if (oEvent.keyCode == 27) DenDZonesShell.CancelDenDOperation();
    },

    CancelDenDOperation: function()
    {
        DenDZonesShell.DenDZones_UpdateDropZones('destroy');
        DenDZonesShell.SetDragInitialized(false);
        DenDZonesShell.SetDragUseDropZones(0);
        DenDZonesShell.bMouseDragActive = false;
        DenDZonesShell.oMouseObject.oNode = null;
        DenDZonesShell.oMouseObject.oOriginalEvent = null;
        DenDZonesShell.oMouseObject.sHoverText = "";
    },

    GetHoverText: function(oEvent, sData, iOffset)
    {
        var sResult = "";
        if (sData && sData != "" && iOffset && iOffset >= 0)
        {
            sData = sData.replace(/\n/g, " ");
            var iStart = sData.lastIndexOf(" ", iOffset) + 1;
            sResult = sData.substr(iStart);
            var iEnd = sResult.indexOf(" ");
            if (iEnd < 0) iEnd = sResult.length;
            sResult = sResult.substr(0, iEnd);
            sResult = sResult.replace(new RegExp("[.,!;'\":?\)\(]+", "gi"), "");
            if (!sResult) sResult = "";
        }
        return sResult;
    },

    GetSelectedText: function()
    {
        var sText = "";
        var oFE = false;
        try
        {
            oFE = document.commandDispatcher.focusedElement;
            sText = oFE.value.substring(oFE.selectionStart, oFE.selectionEnd);
        }
        catch(e1)
        {
            oFE = document.commandDispatcher.focusedWindow;
            try
            {
                var oWindow = new XPCNativeWrapper(oFE, 'document', 'getSelection()');
                sText = oWindow.getSelection();
            }
            catch(e2)
            {
                try
                {
                    sText = oFE.getSelection();
                } catch(e3) {}
            }
        }
        return sText.toString();
    },

    DenDZones_DragOver: function(oEvent)
    {
        DenDZonesShell.bMouseDragActive = false;

        if (document.defaultView.DenDZonesShell.iDenDZones_LastDragTime == 0) document.defaultView.DenDZonesShell.iDenDZones_LastDragTime = new Date().getTime();
        var sDropData = "";

        try {
            var fGetDragData = function (aFlavourSet) {
                var supportsArray = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
                if (nsDragAndDrop.mDragSession) {
                    for (var i = 0; i < nsDragAndDrop.mDragSession.numDropItems; ++i) {
                        var trans = nsTransferable.createTransferable();
                        for (var j = 0; j < aFlavourSet.flavours.length; ++j) trans.addDataFlavor(aFlavourSet.flavours[j].contentType);
                        nsDragAndDrop.mDragSession.getData(trans, i);
                        supportsArray.AppendElement(trans);
                    }
                }
                return supportsArray;
            };

            var flavourSet = DenDZonesShell.DenDZones_DragDropObserver.getSupportedFlavours();
            var transferData = nsTransferable.get(flavourSet, fGetDragData, true);
            var oDropData = transferData.first.first;
            sDropData = transferUtils.retrieveURLFromData(oDropData.data, oDropData.flavour.contentType);
        }
        catch(e) {
            sDropData = "";
        }

        var oSession = nsDragAndDrop.mDragSession;
        if (!oSession) nsDragAndDrop.mDragService.getCurrentSession()
        var iResult = DenDZonesShell.DenDZones_HandleThisDenDOperation(oEvent, oSession, sDropData);
        var iResult2 = DenDZonesShell.DenDZones_CheckDZHandlesThisDrag(oEvent);

        if ((iResult == 1 || iResult == 2 || iResult == 3) && iResult2 == 1)
        {
            nsDragAndDrop.dragOver(oEvent, DenDZonesShell.DenDZones_DragDropObserver);
        }
    },

    DenDZones_Drop: function(oEvent)
    {
        var sDropData = "";

        try {
            var fGetDragData = function (aFlavourSet) {
                var supportsArray = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
                if (nsDragAndDrop.mDragSession) {
                    for (var i = 0; i < nsDragAndDrop.mDragSession.numDropItems; ++i) {
                        var trans = nsTransferable.createTransferable();
                        for (var j = 0; j < aFlavourSet.flavours.length; ++j) trans.addDataFlavor(aFlavourSet.flavours[j].contentType);
                        nsDragAndDrop.mDragSession.getData(trans, i);
                        supportsArray.AppendElement(trans);
                    }
                }
                return supportsArray;
            };

            var flavourSet = DenDZonesShell.DenDZones_DragDropObserver.getSupportedFlavours();
            var transferData = nsTransferable.get(flavourSet, fGetDragData, true);
            var oDropData = transferData.first.first;
            sDropData = transferUtils.retrieveURLFromData(oDropData.data, oDropData.flavour.contentType);
        }
        catch(e) {
            sDropData = "";
        }

        if (!DenDZonesShell.DenDZones_CheckDZHandlesThisDrop(oEvent))
        {
            DenDZonesShell.DenDZones_UpdateDropZones('destroy');
        }
        var iResult = DenDZonesShell.DenDZones_HandleThisDenDOperation(oEvent, nsDragAndDrop.mDragSession, sDropData);
        if (iResult == 1 || iResult == 2 || iResult == 3)
        {
            nsDragAndDrop.drop(oEvent, DenDZonesShell.DenDZones_DragDropObserver);
        }
        document.defaultView.DenDZonesShell.iDenDZones_LastDragTime = 0;
    },

    DenDZones_DragDropExit: function(oEvent)
    {
        nsDragAndDrop.dragExit(oEvent, DenDZonesShell.DenDZones_DragDropObserver);
    },

    DenDZones_HandleThisDenDOperation: function(oEvent, oSession, sData)
    {
        if (oEvent.shiftKey || oEvent.ctrlKey || !this.oDenDZones_Utils.GetBool("dendzoneson")) return -1;
        if (oSession && oSession.isDataFlavorSupported("application/x-moz-file"))
        {
            //Dragged text on Ubuntu can also be saved as txt file.
            if (!oSession.isDataFlavorSupported("text/unicode")) return -2;
        }
        if (oSession && oSession.sourceNode && oSession.sourceNode.localName == "tab") return -3;

        if (typeof(getBrowser) == "function" && (getBrowser().contentDocument.location.href.indexOf("chrome://") >= 0 || getBrowser().contentDocument.location.href.indexOf("about:") >= 0)) return -4;

        var bIsURI = false;
        try
        {
            var oIOS = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            var oURI = oIOS.newURI(sData,null,null);
            oURI.host; //Will fail if it's not a URI...

            bIsURI = true;
        }
        catch (e) {bIsURI = false;}

        if (oSession && oSession.sourceNode && oSession.sourceNode.localName && oSession.sourceNode.localName.toLowerCase() == "img")
        {
            if (!this.oDenDZones_Utils.GetBool("useforimages")) return -6
            return 3;
        }
        if (oEvent && oEvent.target && oEvent.target.nodeName.toLowerCase() == "IMG")

        {
            if (!this.oDenDZones_Utils.GetBool("useforimages")) return -6
            return 3;
        }

        if (oSession && oSession.sourceNode && oSession.sourceNode.localName && oSession.sourceNode.localName.toLowerCase() == "a")
        {
            if (!this.oDenDZones_Utils.GetBool("useforlinks")) return -5
            return 3;
        }
        if (oEvent && oEvent.target && oEvent.target.nodeName.toLowerCase() == "a")

        {
            if (!this.oDenDZones_Utils.GetBool("useforlinks")) return -5
            return 3;
        }
        if (bIsURI)
        {
            if (!this.oDenDZones_Utils.GetBool("useforlinks")) return -5
            return 2;
        }

        if (sData && sData != "")
        {
            if (!this.oDenDZones_Utils.GetBool("usefortext")) return -7
            return 1;
        }

        return 1;
    },

    DenDZones_InitDropZones: function()
    {
        var iX, iY, iMaxAxis = 1;
        var bUpdated = false;

        this.aDenDZones_DropZones = null;
        this.aDenDZones_DropZones = this.oDenDZones_Utils.GetDropZones();

        //Fill empty dropzone(s).
        for (iX = 0; iX < 10; iX ++)
        {
            for (iY = 0; iY < 10; iY ++)
            {
                if (this.aDenDZones_DropZones[iX][iY][3] == "")
                {
                    this.aDenDZones_DropZones[iX][iY][3] = this.oDenDZones_Utils.GetImageForZoneID(this.aDenDZones_DropZones[iX][iY][0]);
                    if (this.aDenDZones_DropZones[iX][iY][3] != "") bUpdated = true;
                }
                if (this.aDenDZones_DropZones[iX][iY][0] != "")
                {
                    if (iMaxAxis < iX || iMaxAxis < iY) iMaxAxis = Math.max(iX, iY);
                }
            }
        }
        if (bUpdated) this.oDenDZones_Utils.SetDropZones(this.aDenDZones_DropZones);

        this.iDenDZones_DropZoneMaxAxis = this.oDenDZones_Utils.GetInt("maxaxis");
        if (this.iDenDZones_DropZoneMaxAxis == 0)
        {
            this.iDenDZones_DropZoneMaxAxis = iMaxAxis + 1;
            if (this.iDenDZones_DropZoneMaxAxis < 2) this.iDenDZones_DropZoneMaxAxis = 2;
        }
    },

    DenDZones_CheckDZStillDragging: function()
    {
        if (this.iDenDZones_StillDragging && this.iDenDZones_StillDragging <= 0)
        {
            DenDZonesShell.DenDZones_UpdateDropZones('destroy');
            DenDZonesShell.bMouseDragActive = false;
            return 0;
        }
        this.iDenDZones_StillDragging --;
        return setTimeout(function() {DenDZonesShell.DenDZones_CheckDZStillDragging();}, 750);
    },

    DenDZones_UpdateDropZones: function(sStatus, oEvent)
    {
        var iMouseX = 0;
        var iMouseY = 0;
        if (oEvent)
        {
            iMouseX = oEvent.clientX;
            iMouseY = oEvent.clientY;
        }
        this.iDenDZones_StillDragging = 1;
        var iWidth, iHeight, iTop, iLeft, iDZWidth, iDZHeight, iX, iY, iHighlightX, iHighlightY;
        var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement();

        iWidth = oRoot.clientWidth - 10;
        iHeight = oRoot.clientHeight - 10;
        iLeft = oRoot.scrollLeft;
        iTop = oRoot.scrollTop;

        iDZWidth = Math.floor(iWidth / this.iDenDZones_DropZoneMaxAxis);
        iDZHeight = Math.floor(iHeight / this.iDenDZones_DropZoneMaxAxis);

        if (sStatus == 'highlight')
        {
            iHighlightX = Math.floor(iMouseX / iDZWidth);
            if (iHighlightX < 0) iHighlightX = 0;
            if (iHighlightX > this.iDenDZones_DropZoneMaxAxis - 1) iHighlightX = this.iDenDZones_DropZoneMaxAxis - 1;
            iHighlightY = Math.floor(iMouseY / iDZHeight);
            if (iHighlightY < 0) iHighlightY = 0;
            if (iHighlightY > this.iDenDZones_DropZoneMaxAxis - 1) iHighlightY = this.iDenDZones_DropZoneMaxAxis - 1;

            if (this.iDenDZones_LastHighlightedDropZoneX != iHighlightX || this.iDenDZones_LastHighlightedDropZoneY != iHighlightY)
            {
                if (this.iDenDZones_LastHighlightedDropZoneX > -1 && this.iDenDZones_LastHighlightedDropZoneY > -1)
                {
                    var iIndex = this.aDenDZones_FadeOutDropZones.length;
                    if (this.aDenDZones_DropZones[this.iDenDZones_LastHighlightedDropZoneX][this.iDenDZones_LastHighlightedDropZoneY][5]) this.aDenDZones_DropZones[this.iDenDZones_LastHighlightedDropZoneX][this.iDenDZones_LastHighlightedDropZoneY][5].setAttribute('highlight', false);

                    this.aDenDZones_FadeOutDropZones[iIndex] = new Array(0, this.aDenDZones_DropZones[this.iDenDZones_LastHighlightedDropZoneX][this.iDenDZones_LastHighlightedDropZoneY][5]);
                }
                this.iDenDZones_LastHighlightedDropZoneX = iHighlightX;
                this.iDenDZones_LastHighlightedDropZoneY = iHighlightY;
            }

            if (this.aDenDZones_DropZones[iHighlightX][iHighlightY][5]) this.aDenDZones_DropZones[iHighlightX][iHighlightY][5].UpdateStatus(sStatus);
        }
        else
        {
            for (iX = 0; iX < this.iDenDZones_DropZoneMaxAxis; iX ++)
            {
                for (iY = 0; iY < this.iDenDZones_DropZoneMaxAxis; iY ++)
                {
                    if (this.aDenDZones_DropZones[iX][iY][0] != "")
                    {
                        if (sStatus == 'show')
                        {
                            this.aDenDZones_DropZones[iX][iY][5] = DenDZonesShell.DenDZones_GetDropZoneUI('denddz_' + iX + '_' + iY);
                            this.aDenDZones_DropZones[iX][iY][5].SetProperties((iX * iDZWidth +  5 + iLeft), (iY * iDZHeight + 5 + iTop), iDZWidth, iDZHeight, this.aDenDZones_DropZones[iX][iY][1] || this.aDenDZones_DropZones[iX][iY][0], this.aDenDZones_DropZones[iX][iY][3], this.iDenDZones_DropZoneMaxAxis, this.aDenDZones_DropZones[iX][iY][4], this.DenDZones_GetContrastTextColor(this.aDenDZones_DropZones[iX][iY][4]));
                        }
                        if (this.aDenDZones_DropZones[iX][iY][5]) this.aDenDZones_DropZones[iX][iY][5].UpdateStatus(sStatus);
                        if (sStatus == 'destroy')
                        {
                            this.aDenDZones_DropZones[iX][iY][5] = null;
                            this.RemoveDropZoneFromRoot('denddz_' + iX + '_' + iY); //Just to be sure...
                        }
                    }
                }
            }

            if (sStatus == 'destroy')
            {
                this.aDenDZones_FadeOutDropZones = null;
                this.aDenDZones_FadeOutDropZones = new Array();
                this.iDenDZones_LastHighlightedDropZoneX = -1;
                this.iDenDZones_LastHighlightedDropZoneY = -1;

                this.SetDragInitialized(false);
                this.SetDragUseDropZones(0);

                this.RemoveDropZoneRoots();
            }
        }
        if (this.aDenDZones_FadeOutDropZones) DenDZonesShell.DenDZones_DropZoneFadeOut();
    },

    DenDZones_DragDropDZSearch: function(sText, iMouseX, iMouseY, sTargetID, oSourceNode, oMouseObject, aEvent)
    {
        if (!this.GetDragInitialized()) return false;

        var iWidth, iHeight, iDZWidth, iDZHeight, iHighlightX, iHighlightY;
        var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement();
        var oItem;

        iWidth = oRoot.clientWidth - 10;
        iHeight = oRoot.clientHeight - 10;
        iDZWidth = Math.floor(iWidth / this.iDenDZones_DropZoneMaxAxis);
        iDZHeight = Math.floor(iHeight / this.iDenDZones_DropZoneMaxAxis);

        iHighlightX = Math.floor(iMouseX / iDZWidth);
        if (iHighlightX < 0) iHighlightX = 0;
        if (iHighlightX > this.iDenDZones_DropZoneMaxAxis) iHighlightX = this.iDenDZones_DropZoneMaxAxis;
        iHighlightY = Math.floor(iMouseY / iDZHeight);
        if (iHighlightY < 0) iHighlightY = 0;
        if (iHighlightY > this.iDenDZones_DropZoneMaxAxis) iHighlightY = this.iDenDZones_DropZoneMaxAxis;
        if ((!this.aDenDZones_DropZones[iHighlightX][iHighlightY][5] || this.aDenDZones_DropZones[iHighlightX][iHighlightY][5].getAttribute('highlight') != 'true')) return false;
        var sID = this.aDenDZones_DropZones[iHighlightX][iHighlightY][0];
        var oSS = Components.classes["@mozilla.org/browser/search-service;1"].getService(Components.interfaces.nsIBrowserSearchService);
        var oEngine = oSS.getEngineByName(sID);

        if (oEngine)
        {
            var oPrevEngine = oSS.currentEngine;
            oSS.currentEngine = oEngine;
            if (BrowserSearch)
            {
                if (oSourceNode && oSourceNode.nodeName == "A") sText =  oSourceNode.text;
                DenDZonesShell.DenDZones_LoadSearch(sText, oEngine);
            }
            if (!this.oDenDZones_Utils.GetBool("switchcurrentengine"))
            {
                oSS.currentEngine = oPrevEngine;
            }
        }
        else
        {
            //Context Menu Action
            try
            {
                /*Hacks for other extensions...*/
                if (typeof(WSProOverlay) == "object") {
                    if (oSourceNode && oSourceNode.nodeName.toLowerCase() == "a") sText =  oSourceNode.text;
                    WSProOverlay.sCurrentSearchText = sText;
                }
                if (typeof(com) == "object" && typeof(com.tineye) == "object" && typeof(com.tineye.tinfox) == "object") {
                    if (oSourceNode && oSourceNode.nodeName.toLowerCase() == "img") sText =  oSourceNode.src;
                    com.tineye.tinfox.targetURL = sText;
                }

                oItem = document.getElementById(sID);
                if (!oItem) oItem = document.getElementsByAttribute("label", this.aDenDZones_DropZones[iHighlightX][iHighlightY][2])[0];

                //You will get an automated warning on this line from AMO but we need to set the node as if we right clicked on it. Otherwise the action "might" not work.
                document.popupNode = oSourceNode;

                gContextMenuContentData = {
                  isRemote: false,
                  event: aEvent,
                  popupNode: oSourceNode,
                  browser: window.getBrowser(),
                  addonInfo: null,
                  documentURIObject: document.documentURIObject,
                  docLocation: document.location.href,
                  charSet: document.characterSet,
                  referrer: document.referrer,
                  referrerPolicy: document.referrerPolicy,
                  contentType: null,
                  contentDisposition: '',
                };
                gContextMenu = new nsContextMenu(document.getElementById("contentAreaContextMenu"), window.getBrowser())
                if (oSourceNode && oSourceNode.childNodes.length == 1 && oSourceNode.firstChild && oSourceNode.firstChild.nodeName == "IMG")
                {
                    gContextMenu.onLoadedImage = true;
                    gContextMenu.onImage = true;
                    gContextMenu.mediaURL = oSourceNode.firstChild.src;
                }
                if (oItem)
                {
                    try
                    {
                        oItem.doCommand();
                    }
                    catch (e)
                    {
                        /*Try to execute the command attribute*/
                        var sCommand = oItem.getAttribute('command');
                        if (sCommand != "")
                        {
                            try
                            {
                                goDoCommand(sCommand);
                            }
                            catch (e)
                            {
                                /*Command is probably not supported in the current context*/
                                this.oDenDZones_Utils.WriteDebugMessage("Drag & DropZones Debug\nCommand [" + oItem.label + "] (" + sID + ", " + sCommand + ") not supported\nError: " + e);
                            }
                        }
                        else
                        {
                            /*Command is probably not supported in the current context*/
                            this.oDenDZones_Utils.WriteDebugMessage("Drag & DropZones Debug\nCommand [" + oItem.label + "] (" + sID + ") not supported\nError: " + e);
                        }
                    }
                }
                else
                {
                    /*Try to execute a stored command*/
                    var sCommand = this.aDenDZones_DropZones[iHighlightX][iHighlightY][2];
                    if (sCommand != "")
                    {
                        try {goDoCommand(sCommand);}
                        catch (e)
                        {
                            /*Command is probably not supported in the current context*/
                            this.oDenDZones_Utils.WriteDebugMessage("Drag & DropZones Debug\nCommand [" + this.aDenDZones_DropZones[iHighlightX][iHighlightY][1] + "] (" + sID + ", " + sCommand + ") not supported\nError: " + e);
                        }
                    }
                    else return false;
                }
            }
            catch (e)
            {
                console.error(e)
                /*Command is probably not supported in the current context*/
                this.oDenDZones_Utils.WriteDebugMessage("Drag & DropZones Debug\nCommand [" + this.aDenDZones_DropZones[iHighlightX][iHighlightY][1] + "] (" + sID + ") not supported\nError: " + e);
                return false;
            }
        }

        return true;
    },

    DenDZones_LoadSearch: function(searchText, engine)
    {
        var ss = Cc["@mozilla.org/browser/search-service;1"].getService(Ci.nsIBrowserSearchService);
        var submission = engine.getSubmission(searchText, null); // HTML response

        if (!submission) return;

        var useNewTab = this.oDenDZones_Utils.GetBool("search.openintab");
        var loadInBackground = !this.oDenDZones_Utils.GetBool("search.activatetab");
        if (useNewTab)
        {
            var referer = getBrowser().selectedBrowser.webNavigation.currentURI;
            getBrowser().loadOneTab(submission.uri.spec, referer, null, submission.postData, loadInBackground, false);
        }
        else loadURI(submission.uri.spec, null, submission.postData, false);
    },


    DenDZones_CheckDZHandlesThisDrag: function(oEvent)
    {
        if (oEvent.shiftKey) return -1;
        var iTime = new Date().getTime();
        if ((iTime - document.defaultView.DenDZonesShell.iDenDZones_LastDragTime) < document.defaultView.DenDZonesShell.oDenDZones_Utils.GetInt("dropzoneshowdelay")) return -2;
        return 1;
    },

    DenDZones_CheckDZHandlesThisDrop: function(oEvent)
    {
        if (!this.GetDragInitialized()) return false;

        var iWidth, iHeight, iDZWidth, iDZHeight, iHighlightX, iHighlightY, iMouseX, iMouseY;
        var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement();

        iMouseX = oEvent.clientX;
        iMouseY = oEvent.clientY;

        iWidth = oRoot.clientWidth - 10;
        iHeight = oRoot.clientHeight - 10;
        iDZWidth = Math.floor(iWidth / this.iDenDZones_DropZoneMaxAxis);
        iDZHeight = Math.floor(iHeight / this.iDenDZones_DropZoneMaxAxis);

        iHighlightX = Math.floor(iMouseX / iDZWidth);
        if (iHighlightX < 0) iHighlightX = 0;
        if (iHighlightX > this.iDenDZones_DropZoneMaxAxis) iHighlightX = this.iDenDZones_DropZoneMaxAxis;
        iHighlightY = Math.floor(iMouseY / iDZHeight);
        if (iHighlightY < 0) iHighlightY = 0;
        if (iHighlightY > this.iDenDZones_DropZoneMaxAxis) iHighlightY = this.iDenDZones_DropZoneMaxAxis;

        if (!this.aDenDZones_DropZones[iHighlightX][iHighlightY][5] || this.aDenDZones_DropZones[iHighlightX][iHighlightY][5].getAttribute('highlight') != 'true') return false;

        return true;
    },

    DenDZones_StoreMousePos: function(oEvent)
    {
        var iWidth, iHeight, iMouseX, iMouseY;
        var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement();

        iWidth = oRoot.clientWidth;
        iHeight = oRoot.clientHeight;
        iMouseX = oEvent.clientX;
        iMouseY = oEvent.clientY;

        if (iMouseX >= 0 && iMouseX <= iWidth && iMouseY >= 0 && iMouseY <= iHeight)
        {
            this.iDenDZones_LastKnownMouseXPos = iMouseX;
            this.iDenDZones_LastKnownMouseYPos = iMouseY;
        }
    },

    DenDZones_CheckDropZonesExit: function(oEvent)
    {
        var iWidth, iHeight, iMouseX, iMouseY;
        var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement(null, true);

        iWidth = oRoot.clientWidth;
        iHeight = oRoot.clientHeight;
        iMouseX = oEvent.clientX;
        iMouseY = oEvent.clientY;

        if (iMouseX > 0 && iMouseX < iWidth && iMouseY > 0 && iMouseY < iHeight)
        {
            return false;
        }

        if (iMouseX != -100 || iMouseY != -100)
        {
            if (this.iDenDZones_LastKnownMouseXPos && this.iDenDZones_LastKnownMouseYPos)
            {
                if (this.iDenDZones_LastKnownMouseXPos > 15 && this.iDenDZones_LastKnownMouseXPos < iWidth - 15 && this.iDenDZones_LastKnownMouseYPos > 15 && this.iDenDZones_LastKnownMouseYPos < iHeight - 15)
                {
                    return false;
                }
            }
        }
        DenDZonesShell.DenDZones_UpdateDropZones('destroy');
        return true;
    },


    DenDZones_DropZoneFadeOut: function()
    {
        var iIndex, iLen = this.aDenDZones_FadeOutDropZones.length;
        var iFadeTime = 2;
        var bSplice;

        for (iIndex = iLen -1; iIndex > -1; iIndex --)
        {
            bSplice = false;
            this.aDenDZones_FadeOutDropZones[iIndex][0] ++;
            if (this.aDenDZones_FadeOutDropZones[iIndex][0] == iFadeTime)
            {
                this.aDenDZones_FadeOutDropZones[iIndex][0] = 0;
                if (this.aDenDZones_FadeOutDropZones[iIndex][1])
                {
                    if (this.aDenDZones_FadeOutDropZones[iIndex][1].getAttribute('highlight') == 'false')
                    {
                        var iOpacity = this.aDenDZones_FadeOutDropZones[iIndex][1].Content.style.opacity - 0.07;
                        this.aDenDZones_FadeOutDropZones[iIndex][1].Content.style.opacity = iOpacity;
                        if (iOpacity <= parseFloat(this.oDenDZones_Utils.GetString("contentopacity")))
                        {
                            this.aDenDZones_FadeOutDropZones[iIndex][1].Content.style.opacity = this.aDenDZones_FadeOutDropZones[iIndex][1].ContentOpacity;
                            bSplice = true;
                        }
                    }
                    else {bSplice = true;}
                }
            }
            if (bSplice) this.aDenDZones_FadeOutDropZones.splice(iIndex, 1);
        }
    },

    DenDZones_GetDropZoneUI: function(sID)
    {
        var DropZone = getBrowser().contentDocument.getElementById(sID);
        if (!DropZone)
        {
            var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement();
            var sContentOpacity = this.oDenDZones_Utils.GetString("contentopacity");
            var sHeaderOpacity = this.oDenDZones_Utils.GetString("headeropacity");
            var sHighLightOpacity = this.oDenDZones_Utils.GetString("highlightopacity");

            DropZone = getBrowser().contentDocument.createElement("div");
            DropZone.id = sID;
            DropZone.className = 'dropzone';
            DropZone.Root = oRoot;
            DropZone.ContentOpacity = sContentOpacity;
            DropZone.HeaderOpacity = sHeaderOpacity;
            DropZone.HighLightOpacity = sHighLightOpacity;

            DropZone.setAttribute('pack', 'start');
            DropZoneHeader = getBrowser().contentDocument.createElement("div");
            DropZoneHeader.setAttribute('style', 'opacity: ' + sHeaderOpacity + ';');
            DropZoneContent = getBrowser().contentDocument.createElement("div");
            DropZoneContent.setAttribute('style', 'opacity: ' + sContentOpacity + ';');

            DropZoneImage = getBrowser().contentDocument.createElement("img");
            DropZoneImage.setAttribute('align', 'left');

            DropZoneLabel = getBrowser().contentDocument.createElement("span");
            DropZoneLabel.appendChild(DropZoneImage);

            DropZoneHeader.appendChild(DropZoneLabel);

            DropZone.appendChild(DropZoneHeader);
            DropZone.appendChild(DropZoneContent);

            DropZone.Header = DropZoneHeader;
            DropZone.Image = DropZoneImage;
            DropZone.Label = DropZoneLabel;
            DropZone.Content = DropZoneContent;
            DropZone.UpdateStatus = function(sStatus)
            {
                switch (sStatus)
                {
                    case "create":
                        this.Header.style.opacity = this.HeaderOpacity;
                        this.Content.style.opacity = this.ContentOpacity;
                        this.style.display = "none";
                        this.setAttribute('highlight', false);
                        break;
                    case "show":
                        this.Header.style.opacity = this.HeaderOpacity;
                        this.Content.style.opacity = this.ContentOpacity;
                        this.style.display = "block";
                        this.setAttribute('highlight', false);
                        break;
                    case "destroy":
                        DropZone.Root.removeChild(this);
                        break;
                    case "highlight":
                        this.Header.style.opacity = this.HighLightOpacity;
                        this.Content.style.opacity = this.HighLightOpacity;
                        this.setAttribute('highlight', true);
                        break;
                }
            }
            DropZone.SetProperties = function(X, Y, Width, Height, sLabel, sImage, iMaxAxis, sColor, sTColor)
            {
                this.style.left = X + "px";
                this.style.top = Y + "px";
                this.style.minWidth = Width + "px";
                this.style.minHeight = Height + "px";
                this.Header.style.minWidth = Width + "px";
                this.Header.style.maxWidth = Width + "px";
                this.Header.style.minHeight = "34px";
                this.Header.style.maxHeight = "34px";
                this.Header.style.color = sTColor;
                this.Header.style.backgroundColor = sColor;

                this.Content.style.minWidth = Width + "px";
                this.Content.style.minHeight = (Height - 34) + "px";
                this.Content.style.top = (Y + 34) + "px";
                this.Content.style.color = sTColor;
                this.Content.style.backgroundColor = sColor;

                if (!sLabel || sLabel == "") sLabel = "Unknown DropZone";

                var iFontEM = 1;
                if (iMaxAxis == 6 || iMaxAxis == 7) iFontEM = 0.9;
                if (iMaxAxis == 8 || iMaxAxis == 9) iFontEM = 0.8;
                if (iMaxAxis == 10) iFontEM = 0.7;
                this.Label.setAttribute("style", "font-size: " + iFontEM + "em;");

                if (sLabel.length > 40 && (iMaxAxis == 4 || iMaxAxis == 5)) sLabel = sLabel.substr(0, 37) + "...";
                if (sLabel.length > 35 && (iMaxAxis == 6 || iMaxAxis == 6)) sLabel = sLabel.substr(0, 32) + "...";
                if (sLabel.length > 30 && (iMaxAxis == 8 || iMaxAxis == 9)) sLabel = sLabel.substr(0, 27) + "...";
                if (sLabel.length > 30 && iMaxAxis == 10) sLabel = sLabel.substr(0, 22) + "...";

                this.Label.appendChild(getBrowser().contentDocument.createTextNode(sLabel));
                this.Image.setAttribute('src', sImage);
            }
            DropZone.style.display = "none";
            DropZone.Root.appendChild(DropZone);
        }
        return DropZone;
    },

    RemoveDropZoneFromRoot: function(sID)
    {
        var oBrowser, oBrowsers = getBrowser.browsers;
        if (!oBrowsers) oBrowsers = new Array(getBrowser());
        var iIndex, iLen = oBrowsers.length;

        for (iIndex = 0; iIndex < iLen; iIndex ++)
        {
            oBrowser = oBrowsers[iIndex];
            var oDropZone = oBrowser.contentDocument.getElementById(sID);
            var oRoot = DenDZonesShell.DenDZones_GetLargestRootElement(oBrowser);
            if (oDropZone && oRoot) oRoot.removeChild(oDropZone);
        }
    },

    RemoveDropZoneRoots: function()
    {
        var oBrowser, oBrowsers = window.top.getBrowser().browsers;
        if (!oBrowsers) oBrowsers = new Array(getBrowser());
        var iIndex, iLen = oBrowsers.length;

        for (iIndex = 0; iIndex < iLen; iIndex ++)
        {
            oBrowser = oBrowsers[iIndex];
            var oDropZoneContentBox = oBrowser.contentDocument.getElementById('dropzonecontentbox');
            if (oDropZoneContentBox) oBrowser.contentDocument.getElementsByTagName("html")[0].removeChild(oDropZoneContentBox);
        }
    },

    GetDragInitialized: function() {return this.bDragInitialized;},
    SetDragInitialized: function(bValue) {this.bDragInitialized = bValue;},
    GetDragUseDropZones: function() {return this.iDenDZones_DragUseDropZones;},
    SetDragUseDropZones: function(iValue) {this.iDenDZones_DragUseDropZones = iValue;},

    DenDZones_GetLargestRootElement: function(oBrowser, bDontCreateElement)
    {
        var oDocument = window._content.document;
        var oDropZoneContentBox = oDocument.getElementById('dropzonecontentbox');
        if (!oDropZoneContentBox)
        {
            if (!bDontCreateElement)
            {
                oDropZoneContentBox = oDocument.createElement("div");
                oDropZoneContentBox.setAttribute('id', 'dropzonecontentbox');
                if (oDocument.getElementsByTagName("html")[0]) oDocument.getElementsByTagName("html")[0].appendChild(oDropZoneContentBox);
            }
            else
            {
                if (getBrowser().contentDocument.body) return getBrowser().contentDocument.body;
                else return window._content.document;
            }
        }

        var iScrollTop, iScrollLeft;

        if (getBrowser().contentDocument.body)
        {
            iScrollLeft = getBrowser().contentDocument.body.scrollLeft;
            if (iScrollLeft == 0) iScrollLeft = getBrowser().contentDocument.documentElement.scrollLeft;
            iScrollTop = getBrowser().contentDocument.body.scrollTop;
            if (iScrollTop == 0) iScrollTop = getBrowser().contentDocument.documentElement.scrollTop;
        }
        else
        {
            iScrollLeft = oDocument.scrollLeft;
            iScrollTop = oDocument.scrollTop;
        }
        oDropZoneContentBox.setAttribute('style', 'height: 100%; left: ' + iScrollLeft + 'px; position: absolute !important; top: ' + iScrollTop + 'px; width: 100%;');

        return oDropZoneContentBox;
    },

    GetURISource: function(sURIData)
    {
        var aData = sURIData.split('\n');
        if (aData.length = 2) return aData[1];
        return sURIData;
    },

    DenDZones_GetContrastTextColor: function(sHexRGB)
    {
        var iR = parseInt(sHexRGB.substr(1,2));
        var iG = parseInt(sHexRGB.substr(3,2));
        var iB = parseInt(sHexRGB.substr(5,2));

        if (isNaN(iR))
        {
            sHexRGB = sHexRGB.replace("rgb(", "").replace(")", "").replace(/ /g, "");
            iR = parseInt(sHexRGB.split(",")[0])
            iG = parseInt(sHexRGB.split(",")[0])
            iB = parseInt(sHexRGB.split(",")[0])
        }

        var iBackY = ((iR * 299) + (iG * 587) + (iB * 114)) / 1000;
        var iTextY = ((0 * 299) + (0 * 587) + (0 * 114)) / 1000;

        var iBDiff = Math.abs(iBackY - iTextY);
        var iCDiff = iR + iG + iB;

        if (iBDiff < 125 && iCDiff <= 250) return "rgb(255,255,255)"
        return "rgb(0,0,0)"
    }
};

window.addEventListener("load",DenDZonesShell.DenDZones_PreInit,false);
window.addEventListener("load",DenDZonesShell.DenDZones_RegisterStyleSheet,true);
window.addEventListener("unload",DenDZonesShell.DenDZones_DeInit,false);
