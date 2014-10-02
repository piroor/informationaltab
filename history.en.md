# History

 - master/HEAD
 - 0.5.2014100301
   * Works correctly on the multi-process mode (E10S).
   * Drop support for Firefox 30 and older versions.
   * Don't show configuration UI for [the preference `browser.tabs.closeButtons` removed on Firefox 32 and later](https://bugzilla.mozilla.org/show_bug.cgi?id=865826).
 - 0.4.2013053001
   * Fixed: Load ru locale correctly. (by Infocatcher)
 - 0.4.2013052901
   * Drop support for Firefox 10-16
   * Improved: Shrink the size of thumbnails in tabs smaller than width of their owner tabs. (foolproof)
   * Improved: Frequency for re-rendering of thumbnails in tabs by changed preferences becomes customizable and throttled. You can change the interval by a secret preference "extensions.informationaltab.thumbnail.update_all_delay".
   * Modified: "jar" archive is no longer included.
   * Modified: Delete all evalInSandbox() codes
   * Modified: Update codes around [session store API](http://dutherenverseauborddelatable.wordpress.com/2013/05/23/add-on-breakage-continued-list-of-add-ons-that-will-probably-be-affected/).
   * ru locale is updated by Infocatcher. Thanks!
 - 4.0.2012122901
   * Works on Nightly 20.0a1.
 - 0.4.2012111001
   * Improved: Reduce CPU usage of updating thumbnails
   * Fixed: Reduce dependencies about an old version of Tree Style Tab.
 - 0.4.2012020901
   * Updated for Nightly 13.0a1.
   * Drop support for Firefox 3.6.
   * Improved: Better compatibility with other tab-related addons. Now this addon doesn't apply custom binding to &lt;tab/&gt;s.
   * Fixed: Thumbnails of to-be-restored tabs were not restored.
   * Fixed: Sometimes position of progress meters in tabs were broken.
   * Fixed: When [Personal Titlebar](https://addons.mozilla.org/firefox/addon/personal-titlebar/) was installed, initializing process was wrongly called twice.
   * da-DK locale is now available, translated by Regmos.
   * zh-CN locale is updated by hzhbest.
 - 0.3.2011020301
   * Improved: Thumbnail of tabs are shown if they are avialable, on about:sessionrestore.
   * Improved: Works with [Personal Titlebar](https://addons.mozilla.org/firefox/addon/personal-titlebar/).
   * Improved: Works with [DragNDrop Toolbars](https://addons.mozilla.org/firefox/addon/dragndrop-toolbars/).
 - 0.3.2011011701
   * Works on Minefield 4.0b10pre.
   * Drop support for Firefox 3.0.
 - 0.3.2010062901
   * Improved: Thumbnail in a tab is automatically hidden when it is pinned by  `pinTab()` . (on Minefield 3.7a6pre)
   * ru-RU locale is updated by L'Autour.
 - 0.3.2010032901
   * Fixed: Features are re-enabled after you exit the print preview mode on Firefox 3.6 or later.
 - 0.3.2010032801
   * Improved: Works with Minefield 3.7a4pre.
   * es-ES locale is updated by tito.
   * zh-CN locale is available, translated by hzhbest.
 - 0.3.2010020301
   * pl locale is available, translated by by Leszek (teo) Życzkowski.
 - 0.3.2010020201
   * Improved: Last thumbnails for tabs are stored to the session information. (Thumbnails for restored tabs are shown even if [BarTap](https://addons.mozilla.org/firefox/addon/67651) is installed.)
   * Fixed: Thumbnails are updated immediately by changing of configurations.
   * Fixed: Square images are fit to the canvas correctly.
   * Fixed: Wrongly positioned (too expanded) progress bar disappeared.
   * it-IT locale is updated. (by Godai71)
   * hu-HU locale is updated. (by Mikes Kaszmán István)
 - 0.3.2009100802
   * Improved: Now you can change appearance of progress bar in tabs.
   * Fixed: Progress bar in tabs is shown correctly even if tab contents are rearranged.
 - 0.3.2009100801
   * Fixed: Progress bar in tabs are shown at their correct position.
   * hu-HU locale is updated. (by Mikes Kaszmán István)
 - 0.3.2009100701
   * Improved: Appearance of progress bar in tab becomes like the mockup for Firefox 3.7. (And you can change the style to old appearance.)
   * Improved: Works with pie graph icon on trunk.
   * Improved: Works with [CookiePie](http://www.nektra.com/products/cookiepie-tab-firefox-extension).
   * Modified: Now modifications of tab attributes are ignored. (for reducing of CPU usage)
 - 0.3.2009090201
   * it-IT locale is updated by Godai71
   * hu-HU locale is updated. (by Mikes Kaszmán István)
 - 0.3.2009062901
   * Improved: Redarawings of thumbnails by page scrolling can be disabled.
   * Improved: Trimmed thumbnails for tabs are available.
   * Fixed: Throbber in tabs is correctly shown with Firefox 3.5 on Mac OS X.
   * it-IT locale is updated by Godai71
 - 0.3.2009051301
   * Updated for Tree Style Tab 0.7.2009051301.
 - 0.3.2009043002
   * Works on Minefield.
 - 0.3.2009043001
   * Fixed: Moving of tab from an window to another works correctly on Shiretoko 3.5b5pre.
 - 0.3.2009042901
   * Improved: Thumbnail rendering for a tab which is showing only an image is optimized.
 - 0.3.2009040201
   * Works on Minefield again.
 - 0.3.2009032501
   * Modified: Color of progress meter in tabs is changed.
   * Fixed: Special styles for tab labels are correctly removed when thumbnails are disabled.
 - 0.3.2009021201
   * Added: ru-RU locale is available. (by L'Autour)
   * it-IT locale is updated. (by Godai71)
 - 0.3.2008112201
   * Fixed: Works on Minefield 3.1b2pre again.
 - 0.3.2008102101
   * Improved: Thumbnails in tabs can be shown above/below/behind their title.
   * hu-HU locale is updated. (by Mikes Kaszmán István)
 - 0.3.2008101701
   * Fixed: Drag and drop of tabs from an window to another works correctly on Minefield 3.1b2pre.
 - 0.3.2008101501
   * Improved: Works on Minefield 3.1b2pre.
   * Improved: Thumbnails can be updated for animations. (Available only on Minefield 3.1b2pre or later.)
   * Improved: The close box in the last tab can be shown. (Available only on Minefield 3.1b2pre or later.)
   * Improved: Tabs can be "read" when the tab get focus.
   * Fixed: A tab which has only an image or non-scrollable contents is correctly marked as "read" when it gets focus.
   * Fixed: Tabs scrolled in background keep themselves "unread".
 - 0.2.2008062001
   * Improved: Works with Tree Style Tab better.
   * Fixed: Progress meters in tabs are correctly hidden after pages are loaded.
 - 0.2.2008061601
   * Fixed: Broken appearance on Mac OS X disappeared.
 - 0.2.2008040701
   * Works on Firefox 3 beta5.
 - 0.2.2008030901
   * Spanish locale is available. (by tito, Thanks!)
   * Works on Minefield 3.0b5pre.
 - 0.2.2008022201
   * Improved: Works on Firefox 3 beta3.
 - 0.2.2007110601
   * Fixed: Broken tab icon with thumbnail before the icon is corrected.
   * Fixed: Position of thumbnail in rightside tabs shown by [Tree Style Tab](http://piro.sakura.ne.jp/xul/_treestyletab.html.en) is corrected.
 - 0.2.2007110501
   * Fixed: Works with [Tab Mix Plus](https://addons.mozilla.org/firefox/addon/1122) correctly.
   * Fixed: Wrong aspect ratio for the tab only includes image disappeared.
   * Added: Italian locale is available. (made by Godai71.Extenzilla)
 - 0.2.2007103101
   * Fixed: Works with [ImgLikeOpera](https://addons.mozilla.org/firefox/addon/1672) correctly.
 - 0.2.2007102702
   * Fixed: Fixed aspect ratio works correctly.
 - 0.2.2007102701
   * Modified: Aspect ratio of thumbnails is fixed to 4:3.
   * Added: Netherlandic locale is available. (made by Neglacio)
 - 0.2.2007102601
   * Fixed: Crash on print preview disappeared.
 - 0.2.2007102501
   * Improved: The position thumbnails are insterted to is changed when appearance of tabs is inverted for rightside tabs by [Tree Style Tab](http://piro.sakura.ne.jp/xul/_treestyletab.html).
 - 0.2.2007060601
   * Fixed: Uninstallation is handled correctly.
   * Added: Hungarian locale is available.
 - 0.2.2007050601
   * Improved: UI to customize appearance of close buttons in tabs is available.
 - 0.1.2007042503
   * Fixed: Broken thumbnail for images disappeared.
 - 0.1.2007042502
   * Fixed: Works with [All-in-One Gestures](https://addons.mozilla.org/firefox/addon/12) correctly.
 - 0.1.2007042501
   * Released.
