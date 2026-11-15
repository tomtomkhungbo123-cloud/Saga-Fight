# Hang đá lãng quên 6.24.2

The cavern now uses a uniform cover transform instead of centered contain framing. Both background paths use the same world transform as fighters and collision geometry. The floor anchors to the bottom of the viewport; vertical tracking compensates for upper framing when fighters jump or stand on high platforms. Screen shake uses the matching display scale. Forest rendering and simulation geometry are unchanged.

Validation: targeted online, projection, Fairi wide-map, Mox, Cylast and Melanta render checks passed. Browser QA verified the cavern fills both horizontal edges. Physical-device verification remains unperformed.
