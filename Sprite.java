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

import javax.microedition.lcdui.*;

 class Sprite  {
	 
     static PushBoxCanvas engine;
	
	 static final int 
	 ////////////////////
	 SPEED = 4,
	 TILE_STEPS_DY = 12,
	 TILE_STEPS = TILE_STEPS_DY,
	 TILE_X = PushBoxCanvas.TILE_DX>>1,
	 TILE_Y = PushBoxCanvas.TILE_DY>>1,
	 STATE_IDLE			= 0,
	 STATE_MOVING		= 1,
	 STATE_PUSHED		= 2,
	 NUM_DIRECTIONS	= 4,
	 DIR_NONE	= -1,
	 DIR_NORTH	= 0,
	 DIR_EAST	= 1,
	 DIR_SOUTH	= 2,
	 DIR_WEST	= 3,
	 DIR_X[] = {0,1,0,-1},
	 DIR_Y[] = {-1,0,1,0},
	 DIR_TILE_X[] = {2,2,-2,-2},
	 DIR_TILE_Y[] = {-1,1,1,-1},
	 BOX			= 0,
	 TARGET			= 1,
	 BOX2		= 2,
	 DEFAULT_FRAME_RATE = 150;	
	
	 static final byte
	 ////////////////////
	 SPRITE_WIDTH[] = { 27,45,45},
	 SPRITE_HEIGHT[] = { 45,44,44},
	 SPRITE_SCAN[] = {1,1,1},
	 SPRITE_OFFSET_X[] = {-14,-21,-21},
	 SPRITE_OFFSET_Y[] = {-41,-32,-32},
	 FRAMES_MOVING[] = {1,0,2,0};
		
	 int
	 //////////////////////
	 frame,
	 frameIndex,
	 frameRate,
	 frameDelay,
	 loops,
	 globalIndex,
	 localIndex,		
	 type,
	 state,
	 ticks,
	 x,
	 y,
	 height,
	 dir,
	 speed,
	 currentTile,
	 tileRow,
	 tileX,
	 tileY,
	 tileOffset,
	 tileTicks,
	 frameOffset,
	 walk,
	 steps,
	 swidth,
	 sheight,
	 scanHeight,
	 scanMask,
	 offsetX,
	 offsetY;
	
	 byte 
	 //////////////
	 frames[];
	
	 boolean
	 ///////////////////
	 isPlayer,
	 moved,
	 painted,
	 move;

	 Image
	 //////////////
	 image;

	 Sprite 
	 /////////////////
	 pushing,
	 prev,
	 next;
		 	
	 Sprite(int globalIndex) {
		this.globalIndex = globalIndex;
	 }
	
	 
	 void init(int type) {
		this.type = type;
		isPlayer = (type==BOX);
		walk = DIR_NONE;
		steps = 0;
		pushing = null;
		move = false;
		setState(STATE_IDLE);		
		Image[] imgs = new Image[]{PushBoxCanvas.data[5],PushBoxCanvas.data[2],PushBoxCanvas.data[4]};		
		setSpriteImage(imgs[type],type);		
	}
	
	 void setState(int state) {		
		frameOffset = 0;	
		byte[] frames = null;
		int frameRate = DEFAULT_FRAME_RATE;
		switch(state) {
			case STATE_IDLE:
				if (isPlayer) {
					frameOffset+=(dir*3);
				}
				break;
			case STATE_MOVING:
				if (isPlayer) {
					frameOffset+=(dir*3);
					frames = FRAMES_MOVING;
				}
				break;
			}
		reset(frames,frameRate);
		this.state = state;
	}
	
	 void setTile(int tileX, int tileY,int dir) {
		tileRow = tileX+tileY;
		x = engine.tile_x(tileX,tileY)+TILE_X;
		y = engine.tile_y(tileX,tileY)+TILE_Y;		
		currentTile = engine.getTile(tileX,tileY);		
		height = 0;		
		this.dir = dir;		
		this.tileX = tileX;
		this.tileY = tileY;		
		steps = 0;		
		tileOffset = 0;
		tileTicks = 0;		
		moved = true;		
		setState(STATE_IDLE);
	}
	
	 boolean doesOccupy(int tileX, int tileY) {
		boolean doesOccupy = false;
		int tx = this.tileX;
		int ty = this.tileY;
		if (tx==tileX && ty==tileY) {
			doesOccupy = true;
		} else if (tileOffset!=0) {
			if (this.tileX+DIR_X[dir]==tx && this.tileY+DIR_Y[dir]==ty) {
				tx-=DIR_X[dir];	
				ty-=DIR_Y[dir];	
			} else {
				tx+=DIR_X[dir];	
				ty+=DIR_Y[dir];	
			}
			if (tx==tileX && ty==tileY)
				doesOccupy = true;
		}
		return doesOccupy;
	}
	
	 void update(int frameTime) {
		boolean stop;
		int distance;
		if (ticks>0) {			
			ticks--;			
			if (ticks==0) {
				setState(state);
			}
		}
		switch(state) {
			case STATE_IDLE:
				if (isPlayer) {
					if (move) {
						move = false;
						if (move(dir)) {
							update(frameTime);
							return;
						}
					}
					if (walk!=DIR_NONE) {
						if (move(walk)) {
							update(frameTime);
							return;
						} else {
							dir = walk;
							setState(STATE_IDLE);
						}
					}						
				}	
				if (frames==FRAMES_MOVING)
					setState(STATE_IDLE);
				break;
			case STATE_MOVING:
				stop = false;
				distance = SPEED;
				if (steps<distance) {
					stop = true;
					if (isPlayer) {
						boolean next = (walk==dir);
						if (next) {
							if (move(dir))
								stop = false;
						}
					} 
					if (stop) distance = steps;
				}
				steps-=distance;
				move(dir,distance);
				if (stop) {
					stop();
					state = STATE_IDLE;
				}
				break;
			}
		tileTicks++;
		animate(frameTime);
		walk = DIR_NONE;
	}
	
	 boolean move(int dir) {
		boolean move = true;
		boolean set = true;
		move = canMove(dir,0);
		if (this.dir==dir && state==STATE_MOVING)
			set = false;	
		if (move || isPlayer)
			this.dir = dir;
		if (move) {
			this.move = false;
			push(dir);
			steps+= TILE_STEPS_DY;
			if (set)
				setState(STATE_MOVING);
			else
				state = STATE_MOVING;
		}
		if(engine.demo)engine.demo_idx++;

		return move;
	}
	
	 void push(int dir) {
		this.dir = dir;
		if (pushing==null)	
			pushing = engine.getObjectSuperType(this.tileX+DIR_X[dir],this.tileY+DIR_Y[dir]);
		if (pushing!=null) {
			pushing.push(dir);
			if (engine.getTile(pushing.tileX+DIR_X[dir],pushing.tileY+DIR_Y[dir])==1) {
				pushing.image=engine.data[4];
				if (engine.getTile(pushing.tileX,pushing.tileY)!=1)
				engine.target_cnt+=1;
				engine.notifyt(this, STATE_PUSHED);
			} else if (engine.getTile(pushing.tileX+DIR_X[dir],pushing.tileY+DIR_Y[dir])==0) {
				if(pushing.image==engine.data[4])
					engine.target_cnt-=1;
				pushing.image=engine.data[2];
			}
			pushing.setState(STATE_PUSHED);
		}
	}
	
	 void stop() {
		if (pushing!=null) {
			pushing.stop();
			pushing = null;
		}
		if (state==STATE_PUSHED)
			state = STATE_IDLE;
		
		steps = 0;
		tileOffset = 0;
	}
	
	 boolean canMove(int dir,int stack) {
		if (!engine.tile_accessible(this,tileX+DIR_X[dir],tileY+DIR_Y[dir],dir))
			return false;
		boolean canMove = true;
		Sprite block =  engine.getObjectSuperType(tileX+DIR_X[dir],tileY+DIR_Y[dir]);	
		if (block!=null) {
			canMove = false;
			if (block!=pushing && (steps!=0||block.state!=STATE_IDLE)) {
			} else if (stack<1) {
				if (block.type==TARGET ||block.type== BOX2) {
					if (isPlayer)
						canMove = block.canMove(dir,stack++);
				}	
			}
		}
		return canMove;
	}
	
	 void changeTile() {
		tileX+=DIR_X[dir];
		tileY+=DIR_Y[dir];
		currentTile = engine.getTile(tileX,tileY);
		tileTicks = 0;
	}
	
	 void move(int dir, int distance) {			
		int offset = tileOffset+distance;		
		if (offset>=TILE_STEPS) {
			tileRow = tileX+tileY;
			tileOffset-=TILE_STEPS;
		}
		if ((tileOffset==0 || offset>TILE_STEPS)&&(dir==DIR_SOUTH || dir==DIR_EAST))
			tileRow = tileX+DIR_X[dir]+tileY+DIR_Y[dir];
		tileOffset+=distance;		
		if ((tileX!=tileX+DIR_X[dir] || tileY!=tileY+DIR_Y[dir]) && tileOffset>=(TILE_STEPS>>1))
			changeTile();		
		x+=DIR_TILE_X[dir]*distance;
		y+=DIR_TILE_Y[dir]*distance;		
		if (pushing!=null)
			pushing.move(dir,distance);
		moved = true;
	}
		
	 void setKeys(int dir) {		
		walk = dir;
	}
		
	 void setSpriteImage(Image img, int type) {
		 image = img;
		 swidth=SPRITE_WIDTH[type];
		 sheight=SPRITE_HEIGHT[type];
		 scanHeight=SPRITE_SCAN[type];
			for (int s=scanHeight ; --s>=0 ; ) 
				scanMask |= (0x1<<s);
		offsetX = SPRITE_OFFSET_X[type];
		offsetY = SPRITE_OFFSET_Y[type];		
	}
	
	 void reset(byte[] frames,int frameRate) {
		this.frames = frames;
		this.frameRate = frameRate;	
		frameIndex = 0;
		frameDelay = frameRate;
		if (frames==null)
			frame = 0;
		else
			frame = frames[frameIndex];	
		loops = 0;
		painted = false;
	}
	
	 void animate(int frameTime) {
		if (frameTime>frameRate) frameTime = frameRate;
		frameDelay-=frameTime;
		if (!painted) return;
		if (frames!=null && frameDelay<=0) {				
			frameIndex++;				
			if (frameIndex==frames.length) {
				frameIndex = 0;
				loops++;
			}				
			frameDelay+=frameRate;
			frame = frames[frameIndex];
			painted = false;
		}
	}
	 
	 void paint(Graphics g) {
			int xframe = frameOffset+this.frame;
			paint(g,x,y-height,xframe);
			painted = true;
		}
		
	void paint(Graphics g, int x, int y, int xframe) {
			x += offsetX;
			y += offsetY;
			int frameX = (xframe >> scanHeight)*swidth;
			int frameY = (xframe & scanMask)*sheight;
            g.setClip(x,y,swidth,sheight);
			g.drawImage(image,x-frameX,y-frameY,Graphics.TOP | Graphics.LEFT);
		}
}
