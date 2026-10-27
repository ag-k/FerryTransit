package android.net;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.os.Parcel;
import android.webkit.WebResourceRequest;
import com.getcapacitor.Bridge;
import com.getcapacitor.WebViewLocalServer;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.URI;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

/** Runs the installed Capacitor security methods with local JVM fixtures; no WebView or HTTP is started. */
public class CapacitorProxySecurityTest {
    @Test
    public void proxyNavigationsAreCancelledBeforePluginsCanAllowThem() throws Exception {
        Bridge bridge = allocate(Bridge.class);
        for (String path : new String[] {
            "/_capacitor_http_interceptor_",
            "/_capacitor_http_interceptor_/nested",
            "/%5Fcapacitor_http_interceptor_"
        }) {
            // Plugins remain unset: reaching plugin dispatch would fail instead of passing this assertion.
            assertTrue(bridge.launchIntent(TestUri.of("https://localhost" + path)));
        }
    }

    @Test
    public void ordinaryDataAndBlobUrlsRemainAllowed() throws Exception {
        Bridge bridge = allocate(Bridge.class);
        Field plugins = Bridge.class.getDeclaredField("plugins");
        plugins.setAccessible(true);
        plugins.set(bridge, new HashMap<>());
        assertFalse(bridge.launchIntent(TestUri.of("data:text/plain,fixture")));
        assertFalse(bridge.launchIntent(TestUri.of("blob:https://localhost/fixture")));
    }

    @Test
    public void mainFrameRequestsAreDocuments() throws Exception {
        assertTrue(isDocument(true, Collections.emptyMap()));
    }

    @Test
    public void iframeNavigationHeadersAreDocumentsRegardlessOfHeaderCase() throws Exception {
        assertTrue(isDocument(false, Collections.singletonMap("Upgrade-Insecure-Requests", "1")));
        assertTrue(isDocument(false, Collections.singletonMap("upgrade-insecure-requests", "1")));
    }

    @Test
    public void fetchSubresourcesAreNotMisclassifiedAsDocuments() throws Exception {
        assertFalse(isDocument(false, Collections.singletonMap("Accept", "application/json")));
    }

    @Test
    public void absentHeadersDoNotCrashDocumentClassification() throws Exception {
        assertFalse(isDocument(false, null));
    }

    private static boolean isDocument(boolean mainFrame, Map<String, String> headers) throws Exception {
        WebViewLocalServer server = allocate(WebViewLocalServer.class);
        Method method = WebViewLocalServer.class.getDeclaredMethod("isDocumentRequest", WebResourceRequest.class);
        method.setAccessible(true);
        WebResourceRequest request = new WebResourceRequest() {
            public Uri getUrl() { return null; }
            public boolean isForMainFrame() { return mainFrame; }
            public boolean isRedirect() { return false; }
            public boolean hasGesture() { return false; }
            public String getMethod() { return "GET"; }
            public Map<String, String> getRequestHeaders() { return headers; }
        };
        return (boolean) method.invoke(server, request);
    }

    private static <T> T allocate(Class<T> type) throws Exception {
        Class<?> unsafeClass = Class.forName("sun.misc.Unsafe");
        Field field = unsafeClass.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Method allocateInstance = unsafeClass.getMethod("allocateInstance", Class.class);
        return type.cast(allocateInstance.invoke(field.get(null), type));
    }

    // Android's host-side Uri constructor is a stub. Bypass it and use java.net.URI for fixture accessors.
    private static final class TestUri extends Uri {
        private URI value;
        static TestUri of(String value) throws Exception {
            TestUri uri = allocate(TestUri.class);
            uri.value = URI.create(value);
            return uri;
        }
        public Builder buildUpon() { return null; }
        public String getAuthority() { return value.getAuthority(); }
        public String getEncodedAuthority() { return value.getRawAuthority(); }
        public String getEncodedFragment() { return value.getRawFragment(); }
        public String getEncodedPath() { return value.getRawPath(); }
        public String getEncodedQuery() { return value.getRawQuery(); }
        public String getEncodedSchemeSpecificPart() { return value.getRawSchemeSpecificPart(); }
        public String getEncodedUserInfo() { return value.getRawUserInfo(); }
        public String getFragment() { return value.getFragment(); }
        public String getHost() { return value.getHost(); }
        public String getLastPathSegment() { return null; }
        public String getPath() { return value.getPath(); }
        public List<String> getPathSegments() { return Collections.emptyList(); }
        public int getPort() { return value.getPort(); }
        public String getQuery() { return value.getQuery(); }
        public String getScheme() { return value.getScheme(); }
        public String getSchemeSpecificPart() { return value.getSchemeSpecificPart(); }
        public String getUserInfo() { return value.getUserInfo(); }
        public boolean isHierarchical() { return !value.isOpaque(); }
        public boolean isRelative() { return !value.isAbsolute(); }
        public String toString() { return value.toString(); }
        public int describeContents() { return 0; }
        public void writeToParcel(Parcel destination, int flags) { }
    }
}
