import colorsys


def hue_to_bgr(hue):
    # convert 0-360 to 0-1 for colorsys
    r, g, b = colorsys.hsv_to_rgb(hue / 360.0, 1.0, 1.0)
    return (int(b * 255), int(g * 255), int(r * 255))