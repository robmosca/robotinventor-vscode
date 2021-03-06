[![Coverage Status](https://coveralls.io/repos/github/robmosca/robotinventor-vscode/badge.svg)](https://coveralls.io/github/robmosca/robotinventor-vscode)

# VScode extension for the Robot inventor set

This is my attempt at writing a Microsoft Visual Studio Code extension to
program the LEGO® MINDSTORMS® Robot Inventor set in MicroPython.

## Known limitations

- I wrote and tested the extension on macOS and Raspbian. I am not sure if it
  works in Windows out of the box
- The connection to the Hub only works via USB at the moment. I tried to connect
  via Bluetooth and it somehow works but it's unstable and it fails from time
  to time, still not sure why.


## How to install

***Before** installing the extension, please read the disclaimer at the end of this
page.*

**Prerequisites**

In order to compile and install the extension you need npm v12.x. If you use
`nvm` simply `nvm use` inside the repository (make sure the npm version
specified in `.nvmrc` is installed).
Also, you need the command line `code` command installed.

**Install the extension**

1. Clone or download the repository
2. Install the dependencies
   
   ```
   npm install
   ```

3. You need to re-compile serial IO for the specific version of node used by
   VS Code

   ```
   ./node_modules/.bin/electron-rebuild --version 11.2.1
   ```

4. Make sure `vsce` is installed

   ```
   npm install -g vsce
   ```

5. Compile and install the extension

   ```
   vsce package
   code --install-extension robotinventor-0.0.1.vsix
   ```


## How to use the extension

After installing the extension open the RI5DEV device browser:

![Connect Hub](./imgs/connect_hub.png)

and click on "Add LEGO Hub". The Hub must be connected via USB. Select the
device:

![Select device](./imgs/select_device.png)

The extension will retrieve the storage status of the Hub and will show all
available programs.

![Storage status](./imgs/storage_status.png)

You can then right click on any slot and perform any of the
following operations:

1. Execute a program
2. Remove a program
3. Move a program from one slot to another
4. Upload a program. You need to have the corresponding micropython file open.

Also, by right-clicking on the Hub you can select the command to stop the
execution of a program.

![Commands](./imgs/commands.png)

## Useful links and external references

Since there is no official documentation for the API, the implementation is based
on what I could discover empirically.
I also obtained information from the following repositories, based on the LEGO®
Education SPIKE™️ Prime Set:
- [gpdaniels/spike-prime](https://github.com/gpdaniels/spike-prime/blob/master/specifications/stm32f413.pdf)
- [nutki/spike-tools](https://github.com/nutki/spike-tools)
- [sanjayseshan/spikeprime-tools](https://github.com/sanjayseshan/spikeprime-tools)

I based my implementation on the excellent work of David Lechner (for EV3): 

[ev3dev/vscode-ev3dev-browser](https://github.com/ev3dev/vscode-ev3dev-browser)

_LEGO and Mindstorms are trademarks of the LEGO Group._

## Disclaimer

_The material embodied in this software is provided to you "as-is" and without_
_warranty of any kind, express, implied or otherwise, including without_
_limitation, any warranty of fitness for a particular purpose. In no event shall_
_the author of this software be liable for any direct, special, incidental,_
_indirect or consequential damages of any kind arising out of or in connection_
_with the possession, use or performance of this software._