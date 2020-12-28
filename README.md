# VScode extension for the Robot inventor set

This is my attempt at writing a Microsoft Visual Studio Code extension to
program the LEGO® Mindstorms® Robot Inventor set in MicroPython.

**The code is incomplete at the moment and the connection to the Hub only works via USB.**

For the moment you can:

1. connect to the hub
2. execute a program
3. detain the execution of a program
4. remove a program
5. move a program from one slot to another

In particular, the functionality for uploading a new python program to the Hub
is still under development.

I tested the extension on macOS, and I am not sure if it will work in Linux or Windows.

Since there is no official documentation for the API, the implementation is based
on what I could discover empirically.
I also obtained information from the following repositories, based on the LEGO®
Education SPIKE™️ Prime Set:
- [gpdaniels/spike-prime](https://github.com/gpdaniels/spike-prime/blob/master/specifications/stm32f413.pdf)
- [nutki/spike-tools](https://github.com/nutki/spike-tools)
- [sanjayseshan/spikeprime-tools](https://github.com/sanjayseshan/spikeprime-tools)

