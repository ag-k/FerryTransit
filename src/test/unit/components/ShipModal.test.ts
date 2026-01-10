import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ShipModal from "@/components/common/ShipModal.vue";

// Stub Teleport component
const stubs = {
  Teleport: {
    template: '<div><slot /></div>'
  }
}

describe("ShipModal", () => {
  const defaultProps = {
    visible: true,
    title: "Test Modal",
  };

  it("renders when visible is true", () => {
    const wrapper = mount(ShipModal, {
      props: defaultProps,
      global: { stubs }
    });

    expect(wrapper.find(".fixed").exists()).toBe(true);
    expect(wrapper.find(".bg-black").exists()).toBe(true);
    expect(wrapper.find("h3").text()).toBe("Test Modal");
  });

  it("does not render when visible is false", () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        visible: false,
      },
      global: { stubs }
    });

    expect(wrapper.find(".fixed").exists()).toBe(false);
    expect(wrapper.find(".bg-black").exists()).toBe(false);
  });

  it("renders ship image for ship type", () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        type: "ship",
        shipId: "FERRY_OKI",
      },
      global: { stubs }
    });

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("/images/FERRY_OKI.jpg");
    expect(img.attributes("alt")).toBe("Test Modal");
  });

  it("renders port content for port type", () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        type: "port",
        content: '<iframe src="map.html"></iframe>',
      },
      global: { stubs }
    });

    expect(wrapper.find(".map-container").html()).toContain(
      '<iframe src="map.html"></iframe>'
    );
  });

  it("renders slot content for custom type", () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        type: "custom",
      },
      slots: {
        default: '<div class="custom-content">Custom content</div>',
      },
      global: { stubs }
    });

    expect(wrapper.find(".custom-content").exists()).toBe(true);
    expect(wrapper.find(".custom-content").text()).toBe("Custom content");
  });

  it("emits close event when close button is clicked", async () => {
    const wrapper = mount(ShipModal, {
      props: defaultProps,
      global: { stubs }
    });

    await wrapper.find("button[aria-label='CLOSE']").trigger("click");

    expect(wrapper.emitted("update:visible")).toBeTruthy();
    expect(wrapper.emitted("update:visible")[0][0]).toBe(false);
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close event when backdrop is clicked", async () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        closeOnBackdrop: true,
      },
      global: { stubs }
    });

    await wrapper.find(".bg-black").trigger("click");

    expect(wrapper.emitted("update:visible")).toBeTruthy();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("does not close on backdrop click when closeOnBackdrop is false", async () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        closeOnBackdrop: false,
      },
      global: { stubs }
    });

    await wrapper.find(".bg-black").trigger("click");

    expect(wrapper.emitted("update:visible")).toBeFalsy();
    expect(wrapper.emitted("close")).toBeFalsy();
  });

  it("handles image error by showing placeholder", async () => {
    const wrapper = mount(ShipModal, {
      props: {
        ...defaultProps,
        type: "ship",
        shipId: "INVALID_SHIP",
      },
      global: { stubs }
    });

    const img = wrapper.find("img");
    await img.trigger("error");

    expect(img.element.src).toContain("/images/placeholder-ship.jpg");
  });

  it("renders footer slot when provided", () => {
    const wrapper = mount(ShipModal, {
      props: defaultProps,
      slots: {
        footer: '<button class="btn btn-primary">Save</button>',
      },
      global: { stubs }
    });

    expect(wrapper.find(".btn-primary").exists()).toBe(true);
    expect(wrapper.find(".btn-primary").text()).toBe("Save");
  });

  it("sets body overflow when modal is shown/hidden", async () => {
    const wrapper = mount(ShipModal, {
      props: {
        visible: false,
        title: "Test",
      },
      global: { stubs }
    });

    // Initially should not affect body
    expect(document.body.style.overflow).toBe("");

    // Show modal
    await wrapper.setProps({ visible: true });
    expect(document.body.style.overflow).toBe("hidden");

    // Hide modal
    await wrapper.setProps({ visible: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("cleans up body overflow on unmount", () => {
    const wrapper = mount(ShipModal, {
      props: defaultProps,
      global: { stubs }
    });

    wrapper.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
