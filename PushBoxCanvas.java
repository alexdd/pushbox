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

import com.nokia.mid.ui.*;
import javax.microedition.lcdui.*;
import java.io.*;


import javax.microedition.rms.*;

 public final class PushBoxCanvas extends FullCanvas implements Runnable {
	 
  	 static char INTRO_TEXT[][][];
 	private static final String STORE_NAME = "PushBoxRMS";


	 static final int
	 ///////////////////
	 SCREEN_WIDTH   = 176,
	 SCREEN_HEIGHT  = 208,
	 SCREEN_HCENTER	= SCREEN_WIDTH>>1,
	 SCREEN_VCENTER	= SCREEN_HEIGHT>>1,
	 TILE_WIDTH = 46,
	 TILE_HEIGHT = 24,	
	 TILE_DX = TILE_WIDTH+2,
	 TILE_DY = TILE_HEIGHT,
	 TEXTURE_WIDTH = 48,
	 TEXTURE_HEIGHT = 48,
	 VP_WIDTH = SCREEN_WIDTH,
	 VP_HEIGHT = SCREEN_HEIGHT,
	 VP_TILES_WIDTH = 5,
	 VP_TILES_HEIGHT = 22,
	 VP_HCENTER = VP_WIDTH>>1,
	 VP_VCENTER = VP_HEIGHT>>1,
	 VP_FOCUS_OX = VP_HCENTER,
	 VP_FOCUS_OY = VP_VCENTER,
	 BORDER_N = 20,
	 BORDER_S = 10,
	 BORDER_E = 10,
	 BORDER_W = 10,
	 STATE_NONE = -1,
	 STATE_GAME = 0,
	 STATE_LEVEL_LOAD = 2,
	 STATE_LEVEL_SELECT	= 3,
	 STATE_START	= 4,
	 STATE_LOADING	= 5,
	 STATE_WIN = 6,
	 TILE_GROUND	= 0,
	 TILE_TARGET	= 1,
	 FRAMERATE_GAME = 40,
	 FRAMERATE_TALKING = 40,
	 MAX_OBJECTS = 32;
     
     static boolean
     ///////////////////////
 	UP = false, 
 	DOWN = false, 
 	LEFT = false, 
 	RIGHT = false,
	 running,
	 paint= true,
	 flag=true,
	 demo=false,
	first=true,
        face=true;
	 
     static int
     /////////////
	 state = STATE_NONE,
	 demo_idx=0,
 	 delay,
 	 tick =0,
	 frameTime,
	 frame_time,
	 target_cnt=0,
	 size_map,
	 width_map,
	 height_map,
	 px_width,
	 px_height,
	 top_map,
	 intro_txt_idx=0,
	 progress=0,
	 max_row,
	 high_corner,
	low_corner,
 	 lev=0,
	 numObjects,
	 boxes = 0,
	 camX,
	 camY,
	 camDX,
	 camDY,
	 min_camX,
	 min_camY,
	 max_camX,
	 max_camY,
        cam_gridX, 
	cam_gridY,
        otx, 
        oty,
        x,
       y,
       index,
      row,
       rOff,
     slide,
     rLen,
     currentIndex=1;
	
	 static Sprite 
	 ////////////////	 
	 sorted,
	 player,
	 objects[] = new Sprite[MAX_OBJECTS],
	 blockes[];
	
	 static Image
	 ////////////
	 data[] = new Image[12],
	 offscreen = null,
  	 FONT_pics[] = new Image[39],
  	 alex[] = new Image[4];
 	 
	 long time;
	 Thread thread;
     Display display;
     PushBox owner;

     PushBoxCanvas(Display d, PushBox owner) {
			display = d;
			this.owner = owner;
		frame_time=FRAMERATE_GAME;

	}
     
     static void demo(int turn) {
    	 UP=false;
    	 DOWN=false;
    	 LEFT=false;
    	 RIGHT=false;
    	 switch(turn) {
    	 case 0:
    	 case 3:
    	 case 4:
    	 case 5:
    	 case 14:
    	 case 15:
    	 case 21:
    	 case 26:
    	 UP= true;
    	 break;
    	 case 1:
    	 case 2:
    	 case 6:
    	 case 9:
    	 case 20:
    	 case 22:
    	 case 23:
    	 LEFT=true;
    	 break;
    	 case 7:
    	 case 8:
    	 case 10:
    	 case 11:
    	 case 12:
    	 case 17:
    	 case 19:
    	 case 24:
    	 case 28:
    	 case 31:
    	 DOWN=true;
    	 break;
    	 case 13:
    	 case 16:
    	 case 18:
    	 case 25:
    	 case 27:
    	 case 29:
    	 case 30:
    		 RIGHT=true;
    		 break;
    	 
    	 default:
    		 demo_idx=0;
    	 break;
    	 }
			if (UP) {

				player.setKeys(Sprite.DIR_NORTH);

			} else if (DOWN) {

				player.setKeys(Sprite.DIR_SOUTH);

			} else if (LEFT) {

				player.setKeys(Sprite.DIR_WEST);

			} else if (RIGHT) {

				player.setKeys(Sprite.DIR_EAST);
			}

     }
     
    static void setSlide() {

		x = -otx;
		y = -oty;

		cam_gridX -= (height_map >> 1);
		index = (cam_gridY * (width_map + 1)) - (cam_gridX * (width_map - 1));

		row = cam_gridY << 1;
		rOff = cam_gridX + cam_gridY;


		if (otx < (TILE_DX >> 1)) {

			if (oty < (TILE_DY >> 1)) {

				x -= TILE_DX >> 1;
				y -= TILE_DY >> 1;
				index--;

				row--;
				rOff--;

				slide = 1;

			} else {

				slide = 0;
			}

		} else {

			if (oty < (TILE_DY >> 1)) {

				x += TILE_DX >> 1;
				y -= TILE_DY >> 1;
				index -= width_map;

				row--;

				slide = 0;

			} else {

				slide = 1;
			}

		}

    }

 	void update() {
		if (camDX != 0 || camDY != 0) {
			camX += camDX;
			camY += camDY;
			camDX = 0;
			camDY = 0;
		}
		setCamera(player.x, player.y);
		for (int i = 0; i < numObjects; i++)
			objects[i].update(frameTime);
		sort();
	}

	public void run() {
		running = true;
		while (running) {
			if (paint) {
				Thread.yield();
				repaint();


			}
			paint = true;
			updateTime(frame_time*3);
			if (delay > 0) {
				delay -= frameTime;
				continue;
			}
			processKeys();
			switch (state) {
			case STATE_LOADING:
            load();
			intro_txt_idx=0;

				setState(STATE_START);
                
				break;
			case STATE_START:
				update();
				break;
			case STATE_LEVEL_SELECT:
				break;
			case STATE_GAME:
				update();
				break;
			case STATE_WIN:
				update();
				break;
			}
  			tick++;
  			if (tick > 10000) {
  				tick = 0;
  			}
  			if (tick >INTRO_TEXT[intro_txt_idx][0].length+INTRO_TEXT[intro_txt_idx][1].length+6) {
  			if (state==STATE_START || state==STATE_LEVEL_SELECT) {
  				tick=0;
  				face=false;
  				intro_txt_idx+=1;
  				if (state != STATE_START)
  					intro_txt_idx%=2;
  				else intro_txt_idx=1;
  			}

  			}
  			if(demo) demo(demo_idx);
		}
		owner.notifyDestroyed();
	}



	void updateTime(int frameRate) {

		long newTime = System.currentTimeMillis();

		if (time == 0)
			frameTime = frameRate;
		else
			frameTime = (int) (newTime - time);

		int ticksLeft = frameRate - frameTime;
		int latency = frameRate >> 2;

		if (ticksLeft > latency) {

			try {
				Thread.sleep(ticksLeft);
			} catch (Exception e) {
			}

		} else {
			Thread.yield();
		}

		newTime = System.currentTimeMillis();
		if (time > 0)
			frameTime = (int) (newTime - time);

		time = newTime;
	}

	void setState(int s) {

		state = s;
		switch (state) {
		case STATE_START:
			tick=0;
			target_cnt=0;
			loadLevel();
			INTRO_TEXT = new char[][][] {
			                          {
  				  new String("Hi there! help").toCharArray(),
		  						new String("me push boxes!").toCharArray(),
		  		},
			                          {
			              				  new String("fire starts...").toCharArray(),
			            		  						new String("left key quits!").toCharArray(),
			            		  		}
			};
			demo=true;
			break;
		case STATE_LEVEL_SELECT:
			loadLevel();
			INTRO_TEXT = new char[][][]{{
	  				  new String("Up or down key").toCharArray(),
			  						new String("to select level").toCharArray(),
			  		},{
			              				  new String("fire starts...").toCharArray(),
			            		  						new String("left key quits!").toCharArray(),
		}
			  		
			};
			demo=false;
			tick=0;
			intro_txt_idx=0;
			break;

		case STATE_GAME:
			INTRO_TEXT = new char[][][]{{
	  				  new String("Go! push boxes!").toCharArray(),
			  						new String("fire quits...").toCharArray(),
			  		},{
	    				  new String("alle Kisten").toCharArray(),
							new String("auf blaue felder").toCharArray(),			  			
			  		}};
			target_cnt = 0;
			tick=0;
			UP=false;
			LEFT=false;
			RIGHT=false;
			DOWN=false;
			intro_txt_idx=0;
			break;
		case STATE_WIN:
			tick=0;
			flag=true;
			INTRO_TEXT = new char[][][]{{
	  				  new String("Good Job!!").toCharArray(),
			  						new String("Stage "+(lev+1)+" cleared").toCharArray(),
			},{
				  new String("you rock! press").toCharArray(),
					new String("fire to continue").toCharArray(),				
			}};
			intro_txt_idx=0;
			break;
		}
			

	}




	int tile_x(int tileX, int tileY) {

		return ((tileX - tileY) * (TILE_DX >> 1)) + top_map;
	}

	int tile_y(int tileX, int tileY) {

		return (tileX + tileY) * (TILE_DY >> 1);
	}


	void notify(Sprite o, int state) {

		switch (state) {

		case Sprite.STATE_PUSHED:
			if (target_cnt==targets[lev]) {
				setState(STATE_WIN);
			}
			break;

		}
	}

	int getDirection(int dx, int dy) {

		int dir = -1;

		int aDx = dx, aDy = dy;

		if (aDx < 0)
			aDx = -aDx;
		if (aDy < 0)
			aDy = -aDy;

		if (aDx > aDy)
			dir = dx > 0 ? 1 : 3;
		else
			dir = dy > 0 ? 2 : 0;

		return dir;
	}

	void setCamera(int x, int y) {

		x -= VP_FOCUS_OX;
		y -= VP_FOCUS_OY;

		camX = (x < min_camX ? min_camX : (x > max_camX ? max_camX
				: x));
		camY = (y < min_camY ? min_camY : (y > max_camY ? max_camY
				: y));
	}

	void resetObjects() {

		numObjects = 0;

		for (int i = 2; --i >= 0;)
			boxes = 0;

		sorted = null;
	}

	Sprite addObject(int type) {

		Sprite o = objects[numObjects++];

		o.init(type);

		int numType = boxes;

		blockes[numType] = o;
		o.localIndex = boxes++;
		add_object(o);
		return o;
	}

	void add_object(Sprite o) {

		Sprite prev = null;
		Sprite next = sorted;

		while (true) {

			if (next == null || next.y > o.y) {

				o.prev = prev;
				o.next = next;

				if (prev == null)
					sorted = o;
				else
					prev.next = o;

				if (next != null)
					next.prev = o;

				break;
			}

			prev = next;
			next = next.next;
		}
	}

	void remove_objectt(Sprite o) {

		if (o.prev != null)
			o.prev.next = o.next;
		else
			sorted = o.next;

		if (o.next != null)
			o.next.prev = o.prev;
	}

	int numObjects(int type) {

		int num = 0;

		for (int i = numObjects; --i >= 0;) {

			if (objects[i].type == type)
				num++;
		}

		return num;
	}

	Sprite getObjectSuperType(int tileX, int tileY) {

		Sprite o = null;
		Sprite[] os = blockes;

		for (int i = boxes; --i >= 0;) {

			Sprite compare = os[i];

			if (compare.doesOccupy(tileX, tileY)) {
				o = compare;
				break;
			}
		}

		return o;
	}

	Sprite getObjectType(int tileX, int tileY, int type) {

		Sprite o = null;
		Sprite[] os = blockes;

		for (int i = boxes; --i >= 0;) {

			Sprite compare = os[i];

			if (compare.type != type)
				continue;

			if (compare.doesOccupy(tileX, tileY)) {
				o = compare;
				break;
			}
		}

		return o;
	}

	void loadLevel() {

		// System.out.println("->loadLevel()");

		resetObjects();

		//

		try {

			size_map = map[lev].length;
			width_map = mapw[lev];
			height_map = size_map / width_map;

			px_width = ((width_map + height_map) * ((TILE_WIDTH >> 1) + 1)) - 2;
			px_height = (width_map + height_map) * (TILE_HEIGHT >> 1);

			top_map = (height_map - 1) * ((TILE_WIDTH >> 1) + 1);

			if (width_map <= height_map) {
				max_row = width_map;
				high_corner = width_map - 1;
				mapCornerLow = height_map - 1;
			} else {
				max_row = height_map;
				high_corner = height_map - 1;
				mapCornerLow = width_map - 1;
			}

			for (int i = 0; i < obj[lev].length; i++) {

				int type = obj[lev][i][0];
				int x = obj[lev][i][1];
				int y = obj[lev][i][2];

				int dir = 0;

				Sprite o = addObject(type);
				o.setTile(x, y, dir);

				if (o.type == Sprite.TYPE_LION)
					player = o;
			}

			System.gc();

		} catch (Exception ioe) {
			ioe.printStackTrace();
		}

		sort();

		min_camX = -BORDER_W;
		min_camY = -BORDER_N;

		max_camX = (px_width + BORDER_E) - VP_WIDTH;
		max_camY = (px_height + BORDER_S) - VP_HEIGHT;

		if (max_camX < 0)
			max_camX = 0;
		if (max_camY < 0)
			max_camY = 0;

		setCamera(player.x, player.y);

	}


	void load() {
		try {
			data = new Image[55];
			data = loadImagesFromBundle("a.bin");


			Sprite.engine = this;

			for (int i = MAX_OBJECTS; --i >= 0;)
				objects[i] = new Sprite(i);

			blockes = new Sprite[20];
					for (int i = 0; i < 36; i++)
						FONT_pics[i + 3] = data[i+6];
					FONT_pics[0] = data[46];
					FONT_pics[1] = data[47];
					FONT_pics[2] = data[48];
					alex[0] = data[42];
					alex[1] = data[43];
					alex[2] = data[44];
					alex[3] = data[45];
					
		} catch (Exception e) {
			e.printStackTrace();
			System.exit(1);
		}
		load_evel();
	}
	
	static void setCamGrid() {
		if (camX >= 0) {
			cam_gridX = camX / TILE_DX;
			otx = camX - (cam_gridX * TILE_DX);
		} else {
			cam_gridX = -((1 - camX) / TILE_DX);
			otx = TILE_DX + camX - (cam_gridX * TILE_DX);
			cam_gridX--;
		}

		if (camY >= 0) {
			cam_gridY = camY / TILE_DY;
			oty = camY - (cam_gridY * TILE_DY);
		} else {
			cam_gridY = -((1 - camY) / TILE_DY);
			oty = TILE_DY + camY - (cam_gridY * TILE_DY);
			cam_gridY--;
		}

		if ((height_map & 0x1) == 0) {
			otx += (TILE_DX >> 1);

			if (otx >= TILE_DX) {
				otx -= TILE_DX;
				cam_gridX++;
			}
		}
	}
	
	public Image[] loadImagesFromBundle(String url) {
		int i = 0;
		Image[] img = null;
		DataInputStream in = null;
		try {
			in = new DataInputStream(this.getClass().getResourceAsStream(url));
			int size = in.readInt();
			img = new Image[size];
			for (i = 0; i < size; i++) {
				byte[] b = new byte[in.readInt()];
				in.readFully(b);
				img[i] = Image.createImage(b, 0, b.length);
					progress++;
				repaint();
			}
		} catch (Exception e) {
		}
		try {
			in.close();
		} catch (Exception e) {
		}
		return img;
	}
	
	protected void paint(Graphics g) {
        if (first) {
            g.setColor(0,0,0);
            g.fillRect(0,0,getWidth(),getHeight());
            first=false;
        }
            g.setClip(0,0,176,208);


		switch (state) {
            


		case STATE_LOADING:
			if(tick==0) {
  				g.setColor(89, 151, 187);
				g.fillRect(0,0,getWidth(),getHeight());
				g.setColor(255,255,255);
			}
			g.fillRect(176/2-27, 208/2-5, progress, 10);
			break;

		case STATE_LEVEL_LOAD:

			break;

		case STATE_START:
		case STATE_LEVEL_SELECT:
		case STATE_GAME:
		case STATE_WIN:

			paintGame(g);
			if (state==STATE_START)
				g.drawImage(data[1], 0, 2, Graphics.TOP | Graphics.LEFT);
			g.setColor(26,97,169);
			g.fillRect(0, 180, 176, 28);
			g.setColor(255,255,255);
		
			int offx = 70;
			int offy=67;
			if(state==STATE_START) {
			if(face){
          	g.setColor(0,48,101);
          	g.drawRect(offx+29,offy+0,69+1,103+1);
          	if (currentIndex == 0) {
            	g.drawImage(alex[0],offx+30,offy+1,Graphics.TOP | Graphics.LEFT);
          	}  else { 	
            	g.drawImage(alex[3],offx+30,offy+1,Graphics.TOP | Graphics.LEFT);
           		g.drawImage(alex[currentIndex],offx+ 40,offy+0+1, Graphics.TOP | Graphics.LEFT);
            }}}
          	offx=0;
          	offy=88;
          	int xx = 0; int  yy = 0;
           char text[][]=  INTRO_TEXT[intro_txt_idx] ;
       		int maxj = 0, maxi = 0;
       
  				g.setColor(89, 151, 187);
      		g.fillRect(offx+xx, offy+yy + 78, 176, 41);
        	g.setColor(0,48,101);
      		g.drawRect(offx+xx, offy+yy + 78, 175, 41);
      		for (int i = 0; i < text.length; i++) {
      			for (int j = 0; j < text[i].length; j++) {
      				if (tick*4 > (i * 2) * (text.length * text[i].length) + 20 + j
      						* text.length) {
      					drawString(g, "" + text[i][j] + "", offx+xx + 4 + j * 10, offy+yy + 87
      							+ i * 15, 40);
      					maxj = j;
      					maxi = i;
      				}
      			}
      		}
      		if (tick*4 % 15 < 7) {
           	if (currentIndex != 0 && !flag) {
          		currentIndex++;
          		if (currentIndex > 2) currentIndex = 1;
           	}
      			if (maxj < text[maxi].length - 1) {
      				g.setColor(202, 233, 251);
      				g.fillRect(offx+xx + 4 + maxj * 10, offy+yy + 87 + maxi * 15, 9, 11);
      			} else {
      				g.setColor(202, 233, 251);
      				g.fillRect(offx+xx + 4 + maxj * 10 + 10,offy+yy + 87 + maxi * 15, 9, 11);
      			}
      		}
      		if (maxi >= text.length-1 && maxj >= text[maxi].length-1) {
      			currentIndex =  0;
      		} else if (maxj >= text[maxi].length-1) {
      			currentIndex = 1;
      			flag = true;
      		} else flag = false;
      		if (state==STATE_LEVEL_SELECT) {
  				g.setColor(89, 151, 187);
  	      		g.fillRect(0, 0, 80, 30);
  	        	g.setColor(0,48,101);
  	      		g.drawRect(0, 0, 79, 30);  
  	      		String levelstrg=""+(lev+1);
  	      		if (lev+1<10)levelstrg="0"+(lev+1); 	      		
				drawString(g, levelstrg + ".stage", 8, 10, 100);
      		}
      		if (state==STATE_WIN) {
      			g.drawImage(data[(tick%4)+49],10,2,Graphics.TOP | Graphics.LEFT);
      		}  
      		break;

		}
		if (getWidth()>176) {
			g.setClip(176,0,45,208);
			g.setColor(0,0,0);
			g.fillRect(176, 0, 45, 208);
		}


	}

	void paintGame(Graphics g) {
		Sprite sorted = PushBoxCanvas.sorted;

		paintTexture(g);
        setCamGrid();		
        setSlide();
        setRlen();


		int tile;

		for (int i = VP_TILES_HEIGHT; --i >= 0; y += TILE_DY >> 1) {

			g.setClip(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

			if (y < SCREEN_HEIGHT)
				for (int j = VP_TILES_WIDTH, px = x, rIndex = index, r = rOff; --j >= 0; px += TILE_DX, rIndex -= (width_map - 1), r++) {

					if (r < 0 || r >= rLen)
						continue;

					tile = map[lev][rIndex];
					if (tile == 1)
						g.drawImage(data[54], px, y,Graphics.TOP | Graphics.LEFT);
					else if (tile == 2)
						g.drawImage(data[3], px, y, Graphics.TOP | Graphics.LEFT);
				}

			//

			g.translate(-camX, -camY);

			while (sorted != null && sorted.tileRow <= row
					&& sorted.tileOffset > 0) {

				if (isOnScreen(sorted))
					sorted.paint(g);
				sorted = sorted.next;
			}

			g.translate(camX, camY);

			g.setClip(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

			g.translate(-camX, -camY);

			while (sorted != null && sorted.tileRow <= row) {
				if (isOnScreen(sorted))
					sorted.paint(g);
				sorted = sorted.next;
			}

			g.translate(camX, camY);
			nextXY();

		}

		g.setClip(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

		// borders
	}

	static boolean isOnScreen(Sprite o) {

		int sx = o.x + o.offsetX;
		int sy = o.y + o.offsetY;

		return ((sx + o.swidth) >= camX && sx < (camX + VP_WIDTH)
				&& (sy + o.sheight) >= camY && sy < (camY + VP_HEIGHT));
	}

	static void paintTexture(Graphics g) {
		Image imgTexture = data[0];

		int ox = camX;
		int oy = camY;

		while (ox < 0)
			ox += TEXTURE_WIDTH;
		while (oy < 0)
			oy += TEXTURE_HEIGHT;

		ox = -(ox % TEXTURE_WIDTH);
		oy = -(oy % TEXTURE_HEIGHT);

		for (int y = oy; y < SCREEN_HEIGHT; y += TEXTURE_HEIGHT)
			for (int x = ox; x < SCREEN_WIDTH; x += TEXTURE_WIDTH)
				g.drawImage(imgTexture, x, y, Graphics.TOP | Graphics.LEFT);

	}
	


	void processKeys() {

		if (state == STATE_GAME) {

			if (UP) {

				player.setKeys(Sprite.DIR_NORTH);

			} else if (DOWN) {

				player.setKeys(Sprite.DIR_SOUTH);

			} else if (LEFT) {

				player.setKeys(Sprite.DIR_WEST);

			} else if (RIGHT) {

				player.setKeys(Sprite.DIR_EAST);
			}
			if (release) {
				UP = false;
				DOWN = false;
				LEFT = false;
				RIGHT = false;
				release = false;
			}
		}

	}



    public void start() {
        		display.setCurrent(this);
		if (thread == null) {

			thread = new Thread(this);
			thread.start();

		}
        setState(STATE_LOADING);
	}
	
	static void nextXY() {
		if (slide == 1) {
			index++;
			x += TILE_DX >> 1;
		} else {
			index += width_map;
			x -= TILE_DX >> 1;
		}

		if (row < high_corner)
			rLen++;
		else if (row >=low_corner)
			rLen--;

		row++;

		if (row < height_map && slide == 1)
			rOff++;

		if (row >= height_map && slide == 0)
			rOff--;

		slide = 1 - slide;

	}

	void exit() {

		//

		running = false;
		thread = null;

		Thread.yield();
	}



	
	static void setRlen() {
		if (row >= height_map)
			rOff -= 1 + (row - height_map);

		rLen = 1 + row;

		if (row <= high_corner)
			rLen = 1 + row;
		else if (row <=low_corner)
			rLen = max_row;
		else
			rLen = max_row +low_corner - row;
	}
	
	public void keyPressed(int keyCode) {
		int action = getGameAction(keyCode);
		switch (action) {

		case Canvas.UP:
			if (state == STATE_GAME) {
				UP=true;
			}
			if (state == STATE_LEVEL_SELECT) {
				if (lev>0) {
					lev--;
					loadLevel();
				}
					else {
						lev=32;
						loadLevel();
					}
			}
			break;
		case Canvas.DOWN:
			if (state == STATE_GAME) {
				DOWN=true;
			}
			if (state == STATE_LEVEL_SELECT) {
				if ( lev<32) {
					lev++;
					loadLevel();
				} else {
					lev=0;
					loadLevel();
				}
			}
			break;
		case Canvas.FIRE:
			if (state == STATE_LEVEL_SELECT) {
				setState(STATE_GAME);				
			}
			else if (state == STATE_WIN) {
				setState(STATE_LEVEL_SELECT);				
			}
			else if (state == STATE_START) {
				setState(STATE_LEVEL_SELECT);				
			}
			else if (state == STATE_GAME) {
				setState(STATE_LEVEL_SELECT);				
			}
			

			break;
		case Canvas.LEFT:
			if (state == STATE_GAME) {
				LEFT=true;
			}
			if (state==STATE_START) {
				running=false;
				saveLevel();
				System.gc();				
			}
			if(state==STATE_LEVEL_SELECT) {
				setState(STATE_START);
				intro_txt_idx=1;

			}
			break;
		case Canvas.RIGHT:
			if (state == STATE_GAME) {
				RIGHT=true;
			}
			break;

		}
	}
	
	boolean release = false;

	public void keyReleased(int e) {
		release = true;

	}

	public void stop() {
		destroy();
	}

	public void destroy() {
		thread = null;
		System.gc();
	}

	void sort() {
		for (int i = numObjects; --i >= 0;) {
			Sprite o = objects[i];
			if (o.moved)
				remove_objectt(o);
		}
		for (int i = numObjects; --i >= 0;) {
			Sprite o = objects[i];
			if (o.moved) {
				add_object(o);
				o.moved = false;
			}
		}
	}
	
	boolean tile_accessible(Sprite o, int tileX, int tileY, int dir) {

		boolean canMove = false;

		if (tileX >= 0 && tileX < width_map && tileY >= 0 && tileY < height_map) {

			int index = tileX + (tileY * width_map);
			int tile = map[lev][index];

			switch (tile) {

			case TILE_GROUND:
			case TILE_TARGET:
				canMove = true;
				break;

			}

		}

		return canMove;
	}
	
	int getTile(int tileX, int tileY) {

		if (tileX < 0 || tileX >= width_map || tileY < 0 || tileY >= height_map) {
			return -1;
		} else {
			int index = (width_map * tileY) + tileX;
			return map[lev][index];
		}
	}

  	void drawString(Graphics g, String str, int x, int y, int width) {
  		int w = 0;
  		String n = new String(str).toUpperCase();
  		char[] chars = new String(n).toCharArray();
  		Image[] line = new Image[chars.length];
  		int[] dx = new int[chars.length];
  		int total = 0;
  		for (int i = 0; i < chars.length; i++) {
  			Image im = null;
  			if ((int) chars[i] != 32) {
  				switch ((int) chars[i]) {
  				case 46:
  					im = FONT_pics[36];
  					break;
  				case 63:
  					im = FONT_pics[38];
  					break;
  				case 33:
  					im = FONT_pics[37];
  					break;
  				}
  				if (im == null) {
  					if ((int) chars[i] >= 48 && (int) chars[i] <= 57)
  						im = FONT_pics[(int) chars[i] - 22];
  					else
  						im = FONT_pics[(int) chars[i] - 65];
  				}
  				dx[i] = im.getWidth() + 1;
  				total += dx[i];
  				line[i] = im;
  			} else {
  				dx[i] = 1;
  				line[i] = null;
  				total += 1;
  			}
  		}
  		int xx = x;
  		for (int i = 0; i < line.length; i++) {
  			if (line[i] != null) {
  				g.drawImage(line[i], xx, y, Graphics.TOP | Graphics.LEFT);
  			}
  			xx += dx[i];
  		}
  	}
  	
	public void saveLevel() {
		RecordStore store = null;
		try {
		  store = RecordStore.openRecordStore(STORE_NAME, true);
		  ByteArrayOutputStream baos = new ByteArrayOutputStream();
		  DataOutputStream dos = new DataOutputStream(baos);
		  dos.writeInt(lev);
		  byte[] toSave = baos.toByteArray();
		  dos.close(); baos.close(); System.gc();
		  try {
		  	store.setRecord(1, toSave, 0, toSave.length);
		  }
		  catch (Exception e) {
		  	store.addRecord(toSave, 0, toSave.length);
		  }
		}
		catch (Exception e) {
			e.printStackTrace();
		  System.out.println("ex save hiscores");
		}
		try {
			store.closeRecordStore();
		}
		catch (Exception e) {
			e.printStackTrace();
			System.out.println("Excp. closing record store");
		}
	}

	public void load_evel() {
		RecordStore store = null;
		byte[] toRead;
		try {
		  store = RecordStore.openRecordStore(STORE_NAME, true);
		  toRead = store.getRecord(1);
		  ByteArrayInputStream bais = new ByteArrayInputStream(toRead);
		  DataInputStream dis = new DataInputStream(bais);
		  lev = dis.readInt();
		  dis.close(); bais.close(); System.gc();
		}
		catch (Exception e) {
			// default values
			lev = 0;
			return;
		}
		try {
			store.closeRecordStore();
		}
		catch (Exception e) {
			e.printStackTrace();
			System.out.println("excp. recordstore");
		}
	}



  	static final byte
	///////////////////	
	obj[][][] = {
		{ { 0, 5, 5 }, { 1, 1, 2 }, { 1, 4, 2 }, { 1, 4, 3 }, { 2, 2, 2 },
				{ 2, 3, 5 }, },
		{ { 0, 1, 5 }, { 1, 1, 2 }, { 1, 4, 3 }, { 1, 3, 4 }, { 2, 2, 2 },
				{ 2, 5, 3 }, { 2, 3, 5 }, },
		{ { 0, 1, 2 }, { 1, 2, 2 }, { 1, 2, 3 }, { 1, 2, 4 }, { 1, 3, 4 },
				{ 2, 1, 3 }, },
		{ { 0, 3, 5 }, { 1, 4, 3 }, { 1, 3, 4 }, { 2, 3, 2 }, { 2, 4, 2 }, },
		{ { 0, 4, 3 }, { 1, 2, 2 }, { 1, 3, 4 }, { 1, 4, 4 }, { 2, 3, 2 },
				{ 2, 2, 4 }, },
		{ { 0, 1, 1 }, { 1, 2, 2 }, { 1, 3, 2 }, { 1, 2, 4 }, { 1, 5, 4 },
				{ 1, 5, 5 }, { 2, 2, 3 }, { 2, 4, 4 }, { 2, 5, 6 }, },
		{ { 0, 6, 4 }, { 1, 2, 2 }, { 1, 5, 3 }, { 1, 6, 3 }, { 1, 4, 4 },
				{ 2, 2, 1 }, { 2, 2, 3 }, { 2, 2, 5 }, { 2, 3, 5 }, },
		{ { 0, 5, 6 }, { 1, 3, 2 }, { 1, 3, 3 }, { 1, 5, 3 }, { 2, 2, 1 },
				{ 2, 5, 2 }, { 2, 1, 4 }, { 2, 3, 4 }, { 2, 6, 4 }, },
		{ { 0, 6, 4 }, { 1, 2, 2 }, { 1, 5, 3 }, { 1, 6, 3 }, { 1, 4, 4 },
				{ 2, 2, 3 }, { 2, 2, 5 }, { 2, 5, 5 }, },
		{ { 0, 1, 4 }, { 1, 2, 2 }, { 1, 4, 2 }, { 1, 5, 2 }, { 1, 4, 3 },
				{ 1, 4, 4 }, { 2, 3, 2 }, { 2, 2, 4 }, },
		{ { 0, 3, 6 }, { 1, 3, 3 }, { 1, 5, 3 }, { 2, 6, 1 }, { 2, 3, 2 },
				{ 2, 5, 2 }, { 2, 2, 3 }, { 2, 6, 5 }, },
		{ { 0, 5, 4 }, { 1, 4, 2 }, { 1, 2, 3 }, { 1, 2, 4 }, { 1, 4, 4 },
				{ 2, 3, 1 }, { 2, 3, 4 }, { 2, 2, 5 }, },
		{ { 0, 2, 3 }, { 1, 1, 2 }, { 1, 4, 3 }, { 1, 3, 4 }, { 1, 4, 4 },
				{ 1, 5, 4 }, { 2, 2, 2 }, },
		{ { 0, 5, 1 }, { 1, 3, 3 }, { 1, 4, 3 }, { 1, 6, 3 }, { 1, 3, 4 },
				{ 1, 5, 4 }, { 1, 2, 5 }, { 2, 4, 1 }, { 2, 2, 3 },
				{ 2, 4, 5 }, },
		{ { 0, 1, 2 }, { 1, 3, 1 }, { 1, 3, 2 }, { 1, 5, 2 }, { 1, 2, 4 },
				{ 2, 2, 2 }, { 2, 2, 3 }, },
		{ { 0, 3, 2 }, { 1, 4, 1 }, { 1, 2, 3 }, { 1, 1, 4 }, { 1, 4, 4 },
				{ 1, 3, 5 }, { 2, 4, 2 }, { 2, 2, 4 }, { 2, 3, 4 }, },
		{ { 0, 4, 4 }, { 1, 3, 2 }, { 1, 5, 2 }, { 1, 3, 3 }, { 1, 1, 4 },
				{ 2, 4, 1 }, { 2, 4, 3 }, { 2, 3, 4 }, { 2, 5, 4 }, },
		{ { 0, 1, 1 }, { 1, 2, 4 }, { 1, 5, 4 }, { 1, 2, 5 }, { 1, 5, 5 },
				{ 2, 2, 3 }, { 2, 5, 6 }, },
		{ { 0, 1, 5 }, { 1, 3, 2 }, { 1, 2, 3 }, { 1, 4, 3 }, { 1, 2, 4 },
				{ 1, 2, 5 }, { 1, 5, 5 }, { 2, 1, 3 }, { 2, 5, 6 }, },
		{ { 0, 1, 4 }, { 1, 2, 2 }, { 1, 3, 4 }, { 1, 4, 4 }, { 1, 2, 5 },
				{ 2, 2, 1 }, { 2, 4, 3 }, },
		{ { 0, 1, 5 }, { 1, 2, 2 }, { 1, 3, 2 }, { 1, 5, 2 }, { 1, 1, 4 },
				{ 2, 3, 4 }, { 2, 2, 5 }, },
		{ { 0, 3, 2 }, { 1, 4, 2 }, { 1, 5, 2 }, { 1, 2, 4 }, { 1, 4, 5 },
				{ 2, 2, 3 }, { 2, 4, 3 }, },
		{ { 0, 5, 2 }, { 1, 3, 2 }, { 1, 2, 3 }, { 1, 1, 4 }, { 1, 3, 4 },
				{ 2, 4, 3 }, { 2, 5, 3 }, { 2, 2, 4 }, },
		{ { 0, 5, 3 }, { 1, 4, 2 }, { 1, 3, 3 }, { 1, 2, 4 }, { 1, 3, 4 },
				{ 1, 3, 5 }, { 2, 6, 2 }, { 2, 5, 4 }, { 2, 5, 5 }, },
		{ { 0, 1, 1 }, { 1, 4, 3 }, { 1, 2, 4 }, { 1, 5, 4 }, { 1, 2, 5 },
				{ 1, 5, 5 }, { 2, 2, 3 }, { 2, 5, 6 }, },
		{ { 0, 1, 5 }, { 1, 5, 3 }, { 1, 4, 4 }, { 1, 5, 5 }, { 1, 3, 6 },
				{ 2, 2, 1 }, { 2, 3, 2 }, { 2, 2, 5 }, },
		{ { 0, 2, 1 }, { 1, 1, 2 }, { 1, 4, 3 }, { 1, 4, 4 }, { 2, 2, 2 },
				{ 2, 4, 2 }, { 2, 5, 2 }, },
		{ { 0, 4, 1 }, { 1, 5, 1 }, { 1, 3, 2 }, { 1, 3, 3 }, { 1, 5, 3 },
				{ 1, 3, 5 }, { 1, 4, 5 }, { 1, 3, 6 }, { 2, 4, 4 }, },
		{ { 0, 1, 4 }, { 1, 2, 2 }, { 1, 3, 2 }, { 1, 4, 2 }, { 1, 2, 4 },
				{ 1, 3, 4 }, { 1, 5, 4 }, { 1, 3, 5 }, { 2, 3, 3 },
				{ 2, 4, 4 }, },
		{ { 0, 6, 2 }, { 1, 4, 2 }, { 1, 4, 4 }, { 2, 4, 1 }, { 2, 1, 4 },
				{ 2, 5, 4 }, { 2, 2, 5 }, { 2, 5, 5 }, { 2, 4, 6 }, },
		{ { 0, 5, 6 }, { 1, 3, 1 }, { 1, 2, 2 }, { 1, 5, 2 }, { 1, 1, 3 },
				{ 1, 3, 3 }, { 1, 2, 4 }, { 1, 5, 4 }, },
		{ { 0, 6, 2 }, { 1, 2, 2 }, { 1, 5, 3 }, { 1, 5, 5 }, { 2, 3, 3 },
				{ 2, 4, 3 }, { 2, 1, 4 }, { 2, 3, 5 }, { 2, 6, 5 },
				{ 2, 2, 6 }, },
		{ { 0, 4, 1 }, { 1, 2, 1 }, { 1, 2, 2 }, { 1, 4, 2 }, { 1, 1, 3 },
				{ 1, 2, 3 }, { 1, 4, 3 }, { 1, 5, 4 }, { 2, 3, 4 }, }
  	},map[][] = {
	{ 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 2, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2,
		0, 0, 0, 0, 0, 2, 2, 0, 1, 1, 0, 0, 2, 2, 0, 0, 1, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2 },
{ 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 2, 2, 0, 1, 0, 2, 0, 2, 2,
		1, 0, 0, 0, 1, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 1, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1, 2, 0, 2, 2,
		1, 0, 0, 0, 1, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 1, 0, 1, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 2, 2, 2, 2, 0, 0, 1, 1, 0, 2, 2,
		0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1, 1, 2, 2, 2, 2, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 2, 0, 2, 2, 0, 0, 1, 0, 0, 2, 2,
		0, 1, 0, 1, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2, 2, 0, 0, 1, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 1, 1, 0, 1, 0, 2, 2, 0, 0, 0, 1, 0, 1, 2, 2, 0,
		0, 1, 0, 0, 0, 2, 2, 2, 2, 0, 0, 1, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 1, 0, 0, 1, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 1, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 1, 1, 2, 2, 0,
		1, 1, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 0, 0, 0, 1, 2, 2, 0, 0, 0, 0, 1,
		0, 2, 2, 0, 1, 0, 0, 0, 0, 2, 2, 1, 0, 1, 0, 0, 1, 2, 2, 1,
		2, 0, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 1, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 1, 2, 2, 0,
		1, 1, 0, 1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 0, 0, 2, 2, 0, 0, 1, 0, 0, 2, 2,
		0, 1, 1, 0, 1, 2, 2, 0, 1, 0, 0, 0, 2, 2, 2, 1, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 0, 0, 1, 2, 2, 0, 0, 1, 0, 1,
		0, 2, 2, 0, 1, 0, 0, 0, 0, 2, 2, 0, 0, 1, 2, 1, 0, 2, 2, 0,
		0, 0, 2, 0, 1, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 0, 0, 2, 2, 1, 0, 0, 0, 1, 2, 2,
		1, 0, 0, 0, 0, 2, 2, 0, 0, 1, 0, 1, 2, 2, 0, 1, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 1, 0, 2, 0, 2, 2,
		1, 0, 0, 0, 1, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 1, 1, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1, 0, 0, 2, 2, 2, 0, 1, 1, 0,
		1, 2, 2, 0, 1, 0, 0, 1, 0, 2, 2, 0, 0, 0, 1, 0, 0, 2, 2, 0,
		0, 0, 1, 1, 2, 2, 2, 2, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2,
		1, 1, 0, 1, 0, 2, 2, 0, 0, 0, 0, 1, 2, 2, 2, 2, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 0, 0, 2, 2, 1, 0, 0, 1, 0, 2, 2,
		0, 0, 0, 0, 0, 2, 2, 0, 1, 1, 0, 1, 2, 2, 1, 1, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1, 1, 2, 2, 0, 0, 0, 0, 0, 2, 2,
		1, 0, 0, 1, 0, 2, 2, 0, 0, 1, 1, 1, 2, 2, 0, 1, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 1, 1, 2, 1, 0, 2, 2, 0, 0, 0, 2, 0, 1, 2, 2, 0,
		0, 0, 0, 0, 0, 2, 2, 0, 2, 0, 0, 1, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 1, 0, 0, 0, 1, 0, 2, 2, 0, 0, 1, 2, 1, 1, 2, 2, 0,
		0, 0, 0, 0, 0, 2, 2, 0, 2, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1, 2, 2,
		1, 2, 0, 1, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 1, 2, 2, 0, 0, 0, 0, 0, 2, 2,
		1, 0, 1, 1, 0, 2, 2, 0, 0, 1, 0, 0, 2, 2, 0, 1, 0, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2,
		0, 1, 0, 1, 0, 2, 2, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 1, 1, 0, 0, 0, 2, 2,
		0, 0, 0, 1, 1, 2, 2, 0, 1, 0, 0, 0, 2, 2, 1, 0, 0, 1, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 2, 2, 0, 0, 0, 0, 0,
		1, 2, 2, 0, 0, 0, 0, 1, 0, 2, 2, 2, 0, 0, 2, 1, 1, 2, 2, 0,
		0, 0, 0, 1, 0, 2, 2, 0, 1, 0, 1, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 1, 1, 0, 1, 0, 2, 2, 0, 0, 1, 2, 0, 1, 2, 2, 0,
		0, 0, 0, 0, 0, 2, 2, 0, 2, 0, 0, 1, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 0, 0, 0, 1, 2, 2, 0, 0, 1, 0, 0,
		0, 2, 2, 0, 1, 0, 2, 0, 0, 2, 2, 0, 0, 0, 0, 1, 0, 2, 2, 0,
		1, 0, 2, 0, 0, 2, 2, 2, 0, 0, 0, 1, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 1, 0, 1, 1, 2, 2,
		1, 0, 2, 0, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 1, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0,
		0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 1, 2, 0, 1, 0, 2, 2, 2, 0,
		2, 0, 0, 2, 0, 2, 2, 1, 0, 0, 0, 1, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0, 2, 2,
		1, 0, 1, 0, 1, 2, 2, 0, 0, 0, 1, 0, 2, 2, 1, 0, 0, 1, 1, 2,
		2, 2, 2, 2, 2, 2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 0, 0, 2, 1, 0, 2, 2, 1, 0, 0, 0, 1, 0, 2, 2, 0,
		1, 0, 1, 1, 0, 2, 2, 2, 0, 0, 1, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 2, 2, 1, 0, 2, 2, 0,
		0, 2, 2, 0, 0, 0, 1, 0, 0, 2, 2, 0, 0, 2, 1, 0, 1, 2, 2, 1,
		0, 0, 0, 2, 0, 2, 2, 2, 2, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0,
		0, 2, 2, 0, 0, 1, 1, 0, 0, 2, 2, 1, 1, 1, 0, 2, 0, 2, 2, 0,
		0, 1, 0, 0, 1, 2, 2, 0, 1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2,
		2, 2, },
{ 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 1, 0, 2, 2, 1, 0, 1, 0, 0, 2, 2,
		0, 0, 0, 0, 1, 2, 2, 0, 0, 1, 1, 0, 2, 2, 0, 0, 1, 0, 0, 2,
		2, 2, 2, 2, 2, 2, 2, },
			},
			 mapw[] = 	{ 7, 7, 7, 7, 7, 8, 8, 8, 8, 7, 8, 7, 7, 8, 7, 7, 7, 8, 8,
				7, 7, 7, 7, 8, 8, 8, 7, 8, 7, 8, 8, 8, 7},
					
				targets[] ={3,3,4,2,3,5,4,3,4,5,2,4,5,6,4,5,4,4,6,4,4,4,4,5,5,4,3,7,7,2,7,3,7};



}
