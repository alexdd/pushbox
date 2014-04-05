/*
The MIT License (MIT)

Copyright (c) 2005 Alex Duesel, http://www.mandarine.,tv

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import javax.microedition.midlet.*;
import javax.microedition.lcdui.*;

public class PushBox extends MIDlet {
    Display display;
    static PushBox app;
   PushBoxCanvas canvas;

    public PushBox() {
    }

    public void startApp() throws MIDletStateChangeException {
    	if(display != null) return;
    	display = Display.getDisplay(this);
    	app = this;
    	canvas = new PushBoxCanvas(display, this);
    	canvas.start();
    }

    public void pauseApp() {
    }

    public void destroyApp(boolean unconditional)
	throws MIDletStateChangeException {
    }
}
