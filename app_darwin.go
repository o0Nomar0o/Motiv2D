//go:build darwin

package main

/*
#cgo darwin LDFLAGS: -L${SRCDIR}/macos -lwindow_control
#cgo darwin LDFLAGS: -L/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx
#cgo darwin LDFLAGS: -framework Cocoa -framework Foundation -lswiftCore -lswiftAppKit
#include "macos/window_control.h"
*/
import "C"
import (
	"context"
)

func applyPlatformCode(ctx context.Context) {
	C.SetTrafficLightPosition(C.double(18.0), C.double(18.0))
}
