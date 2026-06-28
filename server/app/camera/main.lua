--[[
    oph3z-phone | Camera app — SERVER

    Capture happens in the NUI: the phone-view canvas is uploaded client-side
    (binary-safe browser fetch) to the configured provider (Discord/Fivemanage),
    because FiveM's server PerformHttpRequest is not binary-safe (mangles image
    bytes). The returned URL is saved via the shared `oph3z-phone:server:photos:add`
    callback (see server/app/photos), so there's no camera-specific server code.

    Kept as a placeholder so the app folder mirrors the client/NUI structure.
--]]
