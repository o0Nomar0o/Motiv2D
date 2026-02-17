import Cocoa

@_cdecl("SetTrafficLightPosition")
public func SetTrafficLightPosition(x: Double, y: Double) {
    // Instead of taking a pointer, Swift finds the window directly
    DispatchQueue.main.async {
        if let window = NSApplication.shared.windows.first {
            if let closeButton = window.standardWindowButton(.closeButton),
               let titleBarView = closeButton.superview {
                
                var frame = titleBarView.frame
                frame.origin.x = CGFloat(x)
                frame.origin.y = CGFloat(y)
                titleBarView.frame = frame
            }
        }
    }
}