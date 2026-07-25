package com.naturebotlab.ferrytransit;

import android.graphics.Color;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String NAVIGATION_BAR_COLOR = "#F8FAFC";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarStyle();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBarStyle();
    }

    private void applySystemBarStyle() {
        getWindow().setNavigationBarColor(Color.parseColor(NAVIGATION_BAR_COLOR));

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightNavigationBars(true);
        }
    }
}
