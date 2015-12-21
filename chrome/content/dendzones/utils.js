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

The Original Code is Drag & DropZones code.

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
function DenDUtils()
{
    this.Init();
}

DenDUtils.prototype=
{
    oPref:null,
    oStringBundle:null,

    Init:function()
    {
        var sbService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        this.oStringBundle = sbService.createBundle("chrome://dendzones/locale/dendzones.properties");

        this.oPref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        this.oPref = this.oPref.getBranch("extensions.dendzones.");
        this.CheckDefaultPreferences();
        this.GetVersion();
    },

    TranslateString: function(sName, sVar1, sVar2, sVar3)
    {
        var sResult = "";
        if(this.oStringBundle)
        {
            sResult  = this.oStringBundle.GetStringFromName(sName);
            if (sVar1) sResult = sResult.replace(/%1/g, sVar1);
            if (sVar2) sResult = sResult.replace(/%2/g, sVar2);
            if (sVar3) sResult = sResult.replace(/%3/g, sVar3);
            sResult = sResult.replace(/\\/g, ''); //Temporary fix babelzilla escaping bug.
        }
        return sResult;
    },

    CheckDefaultPreferences: function()
    {
        if (!this.HasUserValue("dropzones"))
        {
            this.SetString("dropzones", "");
            this.InitializeDefaultDropZones();
        }

        /*Convert any pref based dropzones to SQLite*/
        if (this.GetString("dropzones") != "")
        {
            this.ConvertPrefDropZones();
            this.SetString("dropzones", "");
        }
    },

    HasUserValue: function(sName)
    {
        return this.oPref.prefHasUserValue(sName);
    },

    GetString :function(sName)
    {
        try {return this.oPref.getCharPref(sName);}
        catch (e) {return "";}
    },

    SetString :function(sName, sValue)
    {
        this.oPref.setCharPref(sName, sValue);
    },

    GetBool :function(sName)
    {
        return this.oPref.getBoolPref(sName);
    },

    SetBool :function(sName, bValue)
    {
        this.oPref.setBoolPref(sName, bValue);
    },

    GetInt :function(sName)
    {
        try {return this.oPref.getIntPref(sName);}
        catch (e) {return 0;}
    },

    SetInt :function(sName, iValue)
    {
        this.oPref.setIntPref(sName, iValue);
    },

    GetLocalizedString: function(sName)
    {
        try {return this.oPref.getComplexValue(sName, Components.interfaces.nsIPrefLocalizedString).data;}
        catch (e) {}
        try {return this.oPref.getCharPref(sName);}
        catch (e) {return "";}
    },

    SetLocalizedString: function(sName, sData)
    {
        var oPLS = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
        oPLS.data = sData;
        this.oPref.setComplexValue(sName, Components.interfaces.nsIPrefLocalizedString, oPLS);
    },

    WriteDebugMessage: function(aMsg)
    {
        var oConsole = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces["nsIConsoleService"]);
        oConsole.logStringMessage(aMsg);
    },

    FindTopParent: function(oElement)
    {
        if (oElement.parentNode)
        {
            while (oElement.parentNode)
            {
                oElement = oElement.parentNode;
            }
        }
        return oElement;
    },

    FindPosX: function(oElement)
    {
        var iX = 0;
        if (oElement.offsetParent)
        {
            while (oElement.offsetParent)
            {
                iX += oElement.offsetLeft;
                oElement = oElement.offsetParent;
            }
        }
        else if (oElement.boxObject.screenX) iX = oElement.boxObject.screenX;
        return iX;
    },

    FindPosY: function(oElement)
    {
        var iY = 0;
        if (oElement.offsetParent)
        {
            while (oElement.offsetParent)
            {
                iY += oElement.offsetTop;
                oElement = oElement.offsetParent;
            }
        }
        else if (oElement.boxObject.screenY) iY = oElement.boxObject.screenY;
        return iY;
    },

    Alltrim: function(sText)
    {
        while (sText.charAt(0) == ' ' || sText.charCodeAt(0) == 13 || sText.charCodeAt(0) == 10 || sText.charCodeAt(0) == 9) sText = sText.substring(1);
        while (sText.charAt(sText.length-1) == ' ' || sText.charCodeAt(sText.length-1) == 13 || sText.charCodeAt(sText.length-1) == 10 || sText.charCodeAt(sText.length-1) == 9) sText = sText.substring(0, sText.length-1);
        return sText;
    },

    PadLeft: function(sString,iLength,sPadChar)
    {
        var iIndex, iPLen, iSLen;

        sString = sString.toString();
        iSLen = sString.length;
        if(iLength <= iSLen) return sString;
        iPLen = iLength - iSLen;
        for(iIndex = 0; iIndex < iPLen; iIndex++) sString = sPadChar + sString;
        return sString;
    },

    RemoveAllChildren: function(oItem, sDontRemoveIDs)
    {
        var sID;
        var iIndex, iLen;

        iLen = oItem.childNodes.length - 1;

        for (iIndex = iLen; iIndex >= 0; iIndex --)
        {
            sID = oItem.childNodes[iIndex].id;
            if ((!sDontRemoveIDs || sDontRemoveIDs.indexOf(sID) == -1) && sID && sID != "")
            {
                oItem.removeChild(oItem.childNodes[iIndex]);
            }
            else
            {
                if (oItem.childNodes[iIndex].childNodes.length > 0) this.RemoveAllChildren(oItem.childNodes[iIndex], sDontRemoveIDs)
            }
        }
    },

    GetTopContentWindow: function()
    {
        return window.top.getBrowser().browsers[window.top.getBrowser().mTabBox.selectedIndex].contentWindow;
    },

    GetTopContentDocument: function()
    {
        return window.top.getBrowser().browsers[window.top.getBrowser().mTabBox.selectedIndex].contentDocument;
    },

    GetIndex: function(aArray, sItem)
    {
        var iIndex, iLen = aArray.length;
        for (iIndex = 0; iIndex < iLen; iIndex ++)
        {
            if (aArray[iIndex][0] == sItem) return iIndex;
        }
        return -1;
    },

    GetVersion: function()
    {
        try
        {
            var oEM = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
            if (oEM.getItemForID) {return oEM.getItemForID("dendzones@captaincaveman.nl").version;}
            else {return oEM.getItemList("dendzones@captaincaveman.nl", null, {})[0].version;}
        }
        catch (e)
        {
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
            var oUtils = this;
            AddonManager.getAddonByID("dendzones@captaincaveman.nl", function(oAddon) {
                oUtils.SetVersion(oAddon.version);
            });
            return this.sCurrentVersion; //Stupid async calls... Just hope it's already there...
        }
    },

    SetVersion: function(sVersion)
    {
        this.sCurrentVersion = sVersion;
    },

    InitializeDefaultDropZones: function()
    {
        if ("nsIBrowserSearchService" in Components.interfaces)
        {
            var oSS = Components.classes["@mozilla.org/browser/search-service;1"].getService(Components.interfaces.nsIBrowserSearchService);
            var oEngines = oSS.getVisibleEngines({});
            var sDropZones = "";
            var iIndex, iLen = oEngines.length;

            var iX = 0; iY = 0, iMaxAxis = 3;

            if (iLen <= 16) iMaxAxis = 3;
            else if (iLen <= 36) iMaxAxis = 5;
            else iMaxAxis = 7;

            for (iIndex = 0; iIndex < iLen; iIndex ++)
            {
                if (iIndex <= 64)
                {
                    //Assign DropZones.
                    sDropZones += 'd_z' + iX + 'd_v' + iY + 'd_v' + oEngines[iIndex].name;
                    iX++;
                    if (iX > iMaxAxis)
                    {
                        iX = 0;
                        iY++;
                    }
                    if (iY > iMaxAxis) iY = 0;
                }
            }
            sDropZones = sDropZones.substr(3);
            this.SetLocalizedString("dropzones", sDropZones);
        }
    },

    ConvertPrefDropZones: function()
    {
        var aTemp = new Array();
        var aDropZones = new Array(10);
        var aDropZone;
        var sColor = this.GetString("dropzonecolor");

        var iIndex, iLen, iX, iY;

        for (iIndex = 0; iIndex < 10; iIndex ++) aDropZones[iIndex] = new Array(10);

        aTemp = this.GetLocalizedString("dropzones").split('d_z');
        iLen = aTemp.length

        for (iIndex = 0; iIndex < iLen; iIndex ++)
        {
            if (aTemp[iIndex] != "")
            {
                aDropZone = new Array();
                aDropZone = aTemp[iIndex].split('d_v');

                iX = aDropZone[0];
                iY = aDropZone[1];

                aDropZones[iX][iY] = new Array(aDropZone[2], aDropZone[3], aDropZone[4], '', sColor);
            }
        }
        this.SetDropZones(aDropZones);
    },

    GetDropZones: function()
    {
        var oDatabase = new DenDZonesDatabase();
        var aResult = oDatabase.GetDropZones();
        oDatabase.DeInitDatabase();

        return aResult;
    },

    SetDropZones: function(aDropZones)
    {
        var oDatabase = new DenDZonesDatabase();

        var iX, iY;
        for (iX = 0; iX < 10; iX ++)
        {
            for (iY = 0; iY < 10; iY ++)
            {
                if (aDropZones[iX][iY])
                {
                    if (!aDropZones[iX][iY][3] || aDropZones[iX][iY][3] == "")
                    {
                        aDropZones[iX][iY][3] = this.GetImageForZoneID(aDropZones[iX][iY][0]);
                    }
                    if (aDropZones[iX][iY][3].indexOf("base64") < 0)
                    {
                        aDropZones[iX][iY][3] = this.RemoteImage2B64(aDropZones[iX][iY][3]);
                    }
                }
            }
        }
        oDatabase.StoreDropZones(aDropZones);
        oDatabase.DeInitDatabase();
    },

    GetImageForZoneID: function(sID)
    {
        if (!sID || sID == "") return "";

        var oSS = Components.classes["@mozilla.org/browser/search-service;1"].getService(Components.interfaces.nsIBrowserSearchService);
        var oEngine = oSS.getEngineByName(sID);

        if (oEngine)
        {
            if (oEngine.iconURI) return oEngine.iconURI.spec;
        }
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACpElEQVQ4jYXRXUhTYRzH8UHldja3VaRlQVDUXWo4FU1STC3LjOkyI4uSMKwbJRQjKb0JCiLoRS2sYXdR1NTMmaVb05npXt37bOqcm6ZQx6SZds5+3ayjy8I/PJffz/Pwf1is4HwuFZLDFwRwFgvgOMOH/SQfNkk4rMfCYT7MgymLi6F0Loz7CRiTCWhELCFr+QyXCEjKO4jAjBmBaQMCU1rQvk+gJ9SgPSrQbgWosfegRjvhvVEEXTxHORi7LpEBnMUCkvL0rxpTIx2gXHLMPKmELo5NMoCjiE9SbjUTt3dfRs3TvahpioW693pI7JIQIGU3oRNx3AxgP8EnqVEVc/OvcSUaXuZgj5aP4rt8qFXVoFxyBrDk7IA2LiyPAaz54eQPZwekrQWQthyHtFmCxzIxzt8TYqstLIhcBeWSB2P2rpAlWnJ55HdbM87Wr0eefBsy2oVIeMeG0L0WUd8icUSzG5fqNmPOIYMpdePKXzAd4pHz9tfo/lCFLmUluhQVaOu8iJL7G3BQsxOldREY1j4ANdoJU/qmlcBQBpdctLUx255zvEJtUywyB7aHxNRYF8yZ/wCMqVxywdrCbFuhqIBUJoZUJg6JabcSluy/gOcs1hpjCmdu0dbKfBVzRt6GxLSnB5ajEdBkBgFDKlFoSCbIL7f2Yfr2AfiqE+Apj4anbM+yEw1PWQw85TGgvX2wiiOXAGMyMTn75g4WjE34OdiI+Y8P4e+ph19VD39PA/y9jzCvbsTsi2q4JAToiX7YCpYBhkRi8uuz2lWf7a1Kgu9aGgJTWthPbYGmIAjo49lZehFbP35F/N+Y9vaB9g0gMKVFYNoI57moJeDP6OLYpF7EgSGBA0MSAWMKgaE0LkyZXJizebDk8mDLD4e9kA/HaT4D/AYOtmDz3+Wg3QAAAABJRU5ErkJggg==";
    },

    RemoteImage2B64: function(sImageURI)
    {
        if (sImageURI && sImageURI != "")
        {
            try
            {
                var oImage = new Image();
                oImage.src = sImageURI;
                var oCanvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
                oCanvas.width = 16;
                oCanvas.height = 16;
                var oContext = oCanvas.getContext('2d');
                oContext.drawImage(oImage, 0, 0, 16, 16);
                var sDataURL = oCanvas.toDataURL();
                return sDataURL;
            }
            catch (e) {return "";}
        }
        return "";
    },

};

function DenDZonesDatabase()
{
    this.Init();
}

DenDZonesDatabase.prototype =
{
    oDabatase: null,

    Init: function()
    {
        var oFile = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
        oFile.append("dendzones.sqlite");
        var oStorageService = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService);
        this.oDabatase = oStorageService.openDatabase(oFile);

        this.InitDatabase();
    },

    InitDatabase: function()
    {
        if (!this.oDabatase.tableExists("zones"))
        {
            this.oDabatase.executeSimpleSQL("CREATE TABLE zones (x INTEGER, y INTEGER, id TEXT, label TEXT, action TEXT, color TEXT, image TEXT)");
        }
    },

    DeInitDatabase: function()
    {
        if (typeof(this.oDabatase.close) == "function") this.oDabatase.close();
        this.oDabatase = null;
    },

    DeleteAllData: function(sTable)
    {
        this.oDabatase.executeSimpleSQL("DELETE FROM zones");
    },

    GetDropZones: function()
    {
        var oStatement;
        var aResult = new Array(10);
        var iIndex;

        for (iIndex = 0; iIndex < 10; iIndex ++) aResult[iIndex] = new Array(10);

        var sID, sLabel, sAction, sColor, sImage;
        var iX, iY;
        oStatement = this.oDabatase.createStatement("SELECT x, y, id, label, action, color, image FROM zones");

        while (oStatement.executeStep())
        {
            iX = oStatement.getInt32(0);
            iY = oStatement.getInt32(1);
            sID = oStatement.getUTF8String(2);
            sLabel = oStatement.getUTF8String(3);
            sAction = oStatement.getUTF8String(4);
            sColor = oStatement.getUTF8String(5);
            sImage = oStatement.getUTF8String(6);

            aResult[iX][iY] = new Array(sID, sLabel, sAction, sImage, sColor);
        }
        oStatement.reset();
        if (typeof(oStatement.finalize) == "function") oStatement.finalize();

        for (iX = 0; iX < 10; iX ++)
        {
            for (iY = 0; iY < 10; iY ++)
            {
                if (!aResult[iX][iY]) aResult[iX][iY] = new Array('', '', '', '', '');
            }
        }

        return aResult;
    },

    StoreDropZones: function(aDropZones)
    {
        var iX, iY = aDropZones.length;

        this.DeleteAllData();
        for (iX = 0; iX < 10; iX ++)
        {
            for (iY = 0; iY < 10; iY ++)
            {
                if (aDropZones[iX][iY]) this.AddDropZone(iX, iY, aDropZones[iX][iY]);
            }
        }
    },

    AddDropZone: function(iX, iY, aDropZone)
    {
        var oStatement;

        oStatement = this.oDabatase.createStatement("INSERT INTO zones VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)");
        oStatement.bindInt32Parameter(0, iX);
        oStatement.bindInt32Parameter(1, iY);
        oStatement.bindUTF8StringParameter(2, aDropZone[0]);//ID
        oStatement.bindUTF8StringParameter(3, aDropZone[1]);//Label
        oStatement.bindUTF8StringParameter(4, aDropZone[2]);//Action
        oStatement.bindUTF8StringParameter(5, aDropZone[4]);//Color
        oStatement.bindUTF8StringParameter(6, aDropZone[3]);//Image
        oStatement.execute();
        oStatement.reset();
        if (typeof(oStatement.finalize) == "function") oStatement.finalize();
    }
};

