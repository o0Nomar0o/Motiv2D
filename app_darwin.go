//go:build darwin

package main

/*
#cgo darwin LDFLAGS: -L${SRCDIR}/Swift -lwindow_control
#cgo darwin LDFLAGS: -L/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx
#cgo darwin LDFLAGS: -framework Cocoa -framework Foundation -lswiftCore -lswiftAppKit
#include "Swift/window_control.h"
*/
import "C"
import "context"

func applyPlatformCode(ctx context.Context) {
    C.SetTrafficLightPosition(20.0, -10.0)
}